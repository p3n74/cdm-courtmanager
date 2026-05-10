import { randomUUID } from "node:crypto";

import { db } from "@cdm-pickleball/db";
import { homeowners } from "@cdm-pickleball/db/schema/homeowners";
import { pickleballReservations } from "@cdm-pickleball/db/schema/pickleball";
import { tennisReservationManagerAllowlist } from "@cdm-pickleball/db/schema/tennis";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { z } from "zod";

import type { CombinedNoShowHistoryItem } from "../homeowner-combined-no-shows";
import {
  countCombinedNoShowsInManilaCalendarMonth,
  fetchCombinedNoShowHistory,
} from "../homeowner-combined-no-shows";
import { managerProcedure, publicProcedure, router } from "../index";
import {
  formatManilaYmd,
  manilaCalendarMonthStartUtc,
  manilaDayBoundsUtc,
  manilaPickleballSlotStartUtc,
} from "../manila";

const dateYmd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const slotHourSchema = z.number().int().min(16).max(21);
const courtBerthSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);

const subdivisionAddress = z.object({
  phase: z.number().int().positive(),
  block: z.number().int().positive(),
  lot: z.number().int().positive(),
});

const createReservationInput = subdivisionAddress.extend({
  date: dateYmd,
  slotHour: slotHourSchema,
  courtBerth: courtBerthSchema,
  reservedByName: z.string().trim().min(1).max(200),
  reservedByContact: z.string().trim().min(1).max(40),
});

async function getOrCreateHomeownerId(input: z.infer<typeof subdivisionAddress>) {
  await db.insert(homeowners).values(input).onConflictDoNothing({ target: [homeowners.phase, homeowners.block, homeowners.lot] });
  const [row] = await db
    .select({ id: homeowners.id })
    .from(homeowners)
    .where(and(eq(homeowners.phase, input.phase), eq(homeowners.block, input.block), eq(homeowners.lot, input.lot)))
    .limit(1);
  if (!row) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to resolve homeowner" });
  }
  return row.id;
}

export const pickleballRouter = router({
  listDay: publicProcedure
    .input(z.object({ date: dateYmd }))
    .query(async ({ input }) => {
      const { start, end } = manilaDayBoundsUtc(input.date);
      const rows = await db
        .select({
          id: pickleballReservations.id,
          slotStart: pickleballReservations.slotStart,
          courtBerth: pickleballReservations.courtBerth,
          noShow: pickleballReservations.noShow,
          homeownerId: pickleballReservations.homeownerId,
          reservedByName: pickleballReservations.reservedByName,
          phase: homeowners.phase,
          block: homeowners.block,
          lot: homeowners.lot,
        })
        .from(pickleballReservations)
        .leftJoin(homeowners, eq(pickleballReservations.homeownerId, homeowners.id))
        .where(and(gte(pickleballReservations.slotStart, start), lt(pickleballReservations.slotStart, end)));
      return { date: input.date, reservations: rows };
    }),

  listManageDay: managerProcedure
    .input(z.object({ date: dateYmd }))
    .query(async ({ input }) => {
      const { start, end } = manilaDayBoundsUtc(input.date);
      const rows = await db
        .select({
          id: pickleballReservations.id,
          slotStart: pickleballReservations.slotStart,
          courtBerth: pickleballReservations.courtBerth,
          noShow: pickleballReservations.noShow,
          homeownerId: pickleballReservations.homeownerId,
          reservedByName: pickleballReservations.reservedByName,
          reservedByContact: pickleballReservations.reservedByContact,
          phase: homeowners.phase,
          block: homeowners.block,
          lot: homeowners.lot,
        })
        .from(pickleballReservations)
        .leftJoin(homeowners, eq(pickleballReservations.homeownerId, homeowners.id))
        .where(and(gte(pickleballReservations.slotStart, start), lt(pickleballReservations.slotStart, end)));
      return { date: input.date, reservations: rows };
    }),

  homeownerReservationHistory: managerProcedure.input(subdivisionAddress).query(async ({ input }) => {
    const [ho] = await db
      .select({ id: homeowners.id })
      .from(homeowners)
      .where(
        and(
          eq(homeowners.phase, input.phase),
          eq(homeowners.block, input.block),
          eq(homeowners.lot, input.lot),
        ),
      )
      .limit(1);

    type HistRow = {
      id: string;
      slotStart: Date;
      courtBerth: number;
      noShow: boolean;
      reservedByName: string;
      reservedByContact: string;
    };

    if (!ho) {
      return {
        phase: input.phase,
        block: input.block,
        lot: input.lot,
        hasHomeownerRow: false as const,
        noShowsInManilaCalendarMonth: 0,
        allHistory: [] as HistRow[],
        noShowHistory: [] as CombinedNoShowHistoryItem[],
      };
    }

    const now = new Date();
    const monthStart = manilaCalendarMonthStartUtc(now);
    const noShowsInManilaCalendarMonth = await countCombinedNoShowsInManilaCalendarMonth(ho.id, monthStart, now);

    const rows = await db
      .select({
        id: pickleballReservations.id,
        slotStart: pickleballReservations.slotStart,
        courtBerth: pickleballReservations.courtBerth,
        noShow: pickleballReservations.noShow,
        reservedByName: pickleballReservations.reservedByName,
        reservedByContact: pickleballReservations.reservedByContact,
      })
      .from(pickleballReservations)
      .where(eq(pickleballReservations.homeownerId, ho.id))
      .orderBy(desc(pickleballReservations.slotStart), desc(pickleballReservations.courtBerth))
      .limit(200);

    const noShowHistory = await fetchCombinedNoShowHistory(ho.id, 200);

    return {
      phase: input.phase,
      block: input.block,
      lot: input.lot,
      hasHomeownerRow: true as const,
      noShowsInManilaCalendarMonth,
      allHistory: rows,
      noShowHistory,
    };
  }),

  isManager: publicProcedure.query(async ({ ctx }) => {
    const session = ctx.session;
    if (!session?.user.email) {
      return { allowed: false };
    }
    const email = session.user.email.trim().toLowerCase();
    const [allowed] = await db
      .select({ id: tennisReservationManagerAllowlist.id })
      .from(tennisReservationManagerAllowlist)
      .where(eq(tennisReservationManagerAllowlist.email, email))
      .limit(1);
    return { allowed: Boolean(allowed) };
  }),

  todayInManila: publicProcedure.query(() => ({
    date: formatManilaYmd(new Date()),
  })),

  createReservation: managerProcedure.input(createReservationInput).mutation(async ({ ctx, input }) => {
    const slotStart = manilaPickleballSlotStartUtc(input.date, input.slotHour);
    const homeownerId = await getOrCreateHomeownerId({
      phase: input.phase,
      block: input.block,
      lot: input.lot,
    });
    try {
      await db.insert(pickleballReservations).values({
        id: randomUUID(),
        slotStart,
        courtBerth: input.courtBerth,
        homeownerId,
        reservedByName: input.reservedByName,
        reservedByContact: input.reservedByContact,
        noShow: false,
        createdByUserId: ctx.session.user.id,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("unique") || msg.includes("23505")) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "That court spot is already reserved for this hour",
        });
      }
      throw e;
    }
    return { ok: true as const };
  }),

  setReservationNoShow: managerProcedure
    .input(z.object({ id: z.string().min(1), noShow: z.boolean() }))
    .mutation(async ({ input }) => {
      const [updated] = await db
        .update(pickleballReservations)
        .set({ noShow: input.noShow })
        .where(eq(pickleballReservations.id, input.id))
        .returning({ id: pickleballReservations.id });
      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Reservation not found" });
      }
      return { ok: true as const };
    }),

  cancelReservation: managerProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const [deleted] = await db.delete(pickleballReservations).where(eq(pickleballReservations.id, input.id)).returning({
        id: pickleballReservations.id,
      });
      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Reservation not found" });
      }
      return { ok: true as const };
    }),
});
