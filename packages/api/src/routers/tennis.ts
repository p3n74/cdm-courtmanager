import { randomUUID } from "node:crypto";

import { db } from "@cdm-pickleball/db";
import { homeowners } from "@cdm-pickleball/db/schema/homeowners";
import { tennisReservationManagerAllowlist, tennisReservations } from "@cdm-pickleball/db/schema/tennis";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, lte, lt } from "drizzle-orm";
import { count } from "drizzle-orm/sql/functions/aggregate";
import { z } from "zod";

import { managerProcedure, publicProcedure, router } from "../index";
import { formatManilaYmd, manilaCalendarMonthStartUtc, manilaDayBoundsUtc, manilaSlotStartUtc } from "../manila";

const dateYmd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const slotHourSchema = z.number().int().min(6).max(15);

const subdivisionAddress = z.object({
  phase: z.number().int().positive(),
  block: z.number().int().positive(),
  lot: z.number().int().positive(),
});

const createReservationInput = subdivisionAddress.extend({
  date: dateYmd,
  slotHour: slotHourSchema,
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

export const tennisRouter = router({
  /** Anyone can view the timetable data. */
  listDay: publicProcedure
    .input(z.object({ date: dateYmd }))
    .query(async ({ input }) => {
      const { start, end } = manilaDayBoundsUtc(input.date);
      const rows = await db
        .select({
          id: tennisReservations.id,
          slotStart: tennisReservations.slotStart,
          noShow: tennisReservations.noShow,
          homeownerId: tennisReservations.homeownerId,
          phase: homeowners.phase,
          block: homeowners.block,
          lot: homeowners.lot,
        })
        .from(tennisReservations)
        .leftJoin(homeowners, eq(tennisReservations.homeownerId, homeowners.id))
        .where(and(gte(tennisReservations.slotStart, start), lt(tennisReservations.slotStart, end)));
      return { date: input.date, reservations: rows };
    }),

  /** Managers only: same as `listDay` plus per-reservation contact (not exposed on the public schedule). */
  listManageDay: managerProcedure
    .input(z.object({ date: dateYmd }))
    .query(async ({ input }) => {
      const { start, end } = manilaDayBoundsUtc(input.date);
      const rows = await db
        .select({
          id: tennisReservations.id,
          slotStart: tennisReservations.slotStart,
          noShow: tennisReservations.noShow,
          homeownerId: tennisReservations.homeownerId,
          reservedByName: tennisReservations.reservedByName,
          reservedByContact: tennisReservations.reservedByContact,
          phase: homeowners.phase,
          block: homeowners.block,
          lot: homeowners.lot,
        })
        .from(tennisReservations)
        .leftJoin(homeowners, eq(tennisReservations.homeownerId, homeowners.id))
        .where(and(gte(tennisReservations.slotStart, start), lt(tennisReservations.slotStart, end)));
      return { date: input.date, reservations: rows };
    }),

  /**
   * All reservations tied to this phase–block–lot (homeowner), newest slot first.
   * Manager-only; includes contact fields for context.
   */
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

    if (!ho) {
      return {
        phase: input.phase,
        block: input.block,
        lot: input.lot,
        hasHomeownerRow: false as const,
        noShowsInManilaCalendarMonth: 0,
        allHistory: [] as {
          id: string;
          slotStart: Date;
          noShow: boolean;
          reservedByName: string;
          reservedByContact: string;
        }[],
        noShowHistory: [] as {
          id: string;
          slotStart: Date;
          noShow: boolean;
          reservedByName: string;
          reservedByContact: string;
        }[],
      };
    }

    const now = new Date();
    const monthStart = manilaCalendarMonthStartUtc(now);
    const [noShowAgg] = await db
      .select({ c: count() })
      .from(tennisReservations)
      .where(
        and(
          eq(tennisReservations.homeownerId, ho.id),
          eq(tennisReservations.noShow, true),
          gte(tennisReservations.slotStart, monthStart),
          lte(tennisReservations.slotStart, now),
        ),
      );

    const noShowsInManilaCalendarMonth = Number(noShowAgg?.c ?? 0);

    const rows = await db
      .select({
        id: tennisReservations.id,
        slotStart: tennisReservations.slotStart,
        noShow: tennisReservations.noShow,
        reservedByName: tennisReservations.reservedByName,
        reservedByContact: tennisReservations.reservedByContact,
      })
      .from(tennisReservations)
      .where(eq(tennisReservations.homeownerId, ho.id))
      .orderBy(desc(tennisReservations.slotStart))
      .limit(200);

    const noShowHistory = rows.filter((r) => r.noShow);

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
    const slotStart = manilaSlotStartUtc(input.date, input.slotHour);
    const homeownerId = await getOrCreateHomeownerId({
      phase: input.phase,
      block: input.block,
      lot: input.lot,
    });
    try {
      await db.insert(tennisReservations).values({
        id: randomUUID(),
        slotStart,
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
          message: "That hour is already reserved",
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
        .update(tennisReservations)
        .set({ noShow: input.noShow })
        .where(eq(tennisReservations.id, input.id))
        .returning({ id: tennisReservations.id });
      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Reservation not found" });
      }
      return { ok: true as const };
    }),

  cancelReservation: managerProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const [deleted] = await db.delete(tennisReservations).where(eq(tennisReservations.id, input.id)).returning({
        id: tennisReservations.id,
      });
      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Reservation not found" });
      }
      return { ok: true as const };
    }),
});
