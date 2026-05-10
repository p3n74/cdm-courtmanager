import { randomUUID } from "node:crypto";

import { db } from "@cdm-pickleball/db";
import { homeowners } from "@cdm-pickleball/db/schema/homeowners";
import { pickleballReservations } from "@cdm-pickleball/db/schema/pickleball";
import {
  tennisReservationManagerAllowlist,
  tennisReservations,
} from "@cdm-pickleball/db/schema/tennis";
import { TRPCError } from "@trpc/server";
import { and, asc, count, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";

import { managerProcedure, router } from "../index";
import { manilaCalendarMonthStartUtc } from "../manila";

const emailSchema = z
  .string()
  .trim()
  .min(3)
  .max(254)
  .transform((v) => v.toLowerCase())
  .pipe(z.string().email());

export const managersRouter = router({
  list: managerProcedure.query(async () => {
    const rows = await db
      .select({
        id: tennisReservationManagerAllowlist.id,
        email: tennisReservationManagerAllowlist.email,
        createdAt: tennisReservationManagerAllowlist.createdAt,
      })
      .from(tennisReservationManagerAllowlist)
      .orderBy(asc(tennisReservationManagerAllowlist.email));
    return { managers: rows };
  }),

  add: managerProcedure.input(z.object({ email: emailSchema })).mutation(async ({ input }) => {
    try {
      await db.insert(tennisReservationManagerAllowlist).values({
        id: randomUUID(),
        email: input.email,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("unique") || msg.includes("23505")) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "That email is already a manager",
        });
      }
      throw e;
    }
    return { ok: true as const };
  }),

  remove: managerProcedure.input(z.object({ id: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const [row] = await db
      .select({ email: tennisReservationManagerAllowlist.email })
      .from(tennisReservationManagerAllowlist)
      .where(eq(tennisReservationManagerAllowlist.id, input.id))
      .limit(1);
    if (!row) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Manager entry not found" });
    }

    const [{ c: managerCount }] = await db.select({ c: count() }).from(tennisReservationManagerAllowlist);
    const n = Number(managerCount ?? 0);
    if (n <= 1) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot remove the last reservation manager.",
      });
    }

    const myEmail = ctx.session.user.email?.trim().toLowerCase();
    if (myEmail && row.email === myEmail) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Remove another manager before removing your own access, or ask another manager to revoke your email.",
      });
    }

    const [deleted] = await db
      .delete(tennisReservationManagerAllowlist)
      .where(eq(tennisReservationManagerAllowlist.id, input.id))
      .returning({ id: tennisReservationManagerAllowlist.id });
    if (!deleted) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Manager entry not found" });
    }
    return { ok: true as const };
  }),

  /** Homeowners with three or more no-shows combined (tennis + pickleball) in the current Manila calendar month through now—same rule as booking warnings. */
  listSuspendedHomeowners: managerProcedure.query(async () => {
    const now = new Date();
    const monthStart = manilaCalendarMonthStartUtc(now);

    const tennisRows = await db
      .select({
        homeownerId: tennisReservations.homeownerId,
        reservationId: tennisReservations.id,
        slotStart: tennisReservations.slotStart,
        reservedByName: tennisReservations.reservedByName,
        reservedByContact: tennisReservations.reservedByContact,
        phase: homeowners.phase,
        block: homeowners.block,
        lot: homeowners.lot,
      })
      .from(tennisReservations)
      .innerJoin(homeowners, eq(tennisReservations.homeownerId, homeowners.id))
      .where(
        and(
          eq(tennisReservations.noShow, true),
          gte(tennisReservations.slotStart, monthStart),
          lte(tennisReservations.slotStart, now),
        ),
      );

    const pickleRows = await db
      .select({
        homeownerId: pickleballReservations.homeownerId,
        reservationId: pickleballReservations.id,
        slotStart: pickleballReservations.slotStart,
        reservedByName: pickleballReservations.reservedByName,
        reservedByContact: pickleballReservations.reservedByContact,
        courtBerth: pickleballReservations.courtBerth,
        phase: homeowners.phase,
        block: homeowners.block,
        lot: homeowners.lot,
      })
      .from(pickleballReservations)
      .innerJoin(homeowners, eq(pickleballReservations.homeownerId, homeowners.id))
      .where(
        and(
          eq(pickleballReservations.noShow, true),
          gte(pickleballReservations.slotStart, monthStart),
          lte(pickleballReservations.slotStart, now),
        ),
      );

    type Incident =
      | {
          reservationId: string;
          sport: "tennis";
          slotStart: Date;
          reservedByName: string;
          reservedByContact: string;
        }
      | {
          reservationId: string;
          sport: "pickleball";
          slotStart: Date;
          reservedByName: string;
          reservedByContact: string;
          courtBerth: number;
        };

    type AggRow = {
      homeownerId: string;
      phase: number;
      block: number;
      lot: number;
      incidents: Incident[];
    };

    const byId = new Map<string, AggRow>();

    function ensureRow(
      homeownerId: string,
      phase: number,
      block: number,
      lot: number,
    ): AggRow {
      let row = byId.get(homeownerId);
      if (!row) {
        row = { homeownerId, phase, block, lot, incidents: [] };
        byId.set(homeownerId, row);
      }
      return row;
    }

    for (const r of tennisRows) {
      if (!r.homeownerId) continue;
      const row = ensureRow(r.homeownerId, r.phase, r.block, r.lot);
      row.incidents.push({
        reservationId: r.reservationId,
        sport: "tennis",
        slotStart: r.slotStart,
        reservedByName: r.reservedByName,
        reservedByContact: r.reservedByContact,
      });
    }

    for (const r of pickleRows) {
      if (!r.homeownerId) continue;
      const row = ensureRow(r.homeownerId, r.phase, r.block, r.lot);
      row.incidents.push({
        reservationId: r.reservationId,
        sport: "pickleball",
        slotStart: r.slotStart,
        reservedByName: r.reservedByName,
        reservedByContact: r.reservedByContact,
        courtBerth: r.courtBerth,
      });
    }

    const suspended = [...byId.values()]
      .filter((h) => h.incidents.length >= 3)
      .map((h) => ({
        homeownerId: h.homeownerId,
        phase: h.phase,
        block: h.block,
        lot: h.lot,
        noShowCount: h.incidents.length,
        incidents: [...h.incidents].sort((a, b) => b.slotStart.getTime() - a.slotStart.getTime()),
      }))
      .sort((a, b) => {
        if (b.noShowCount !== a.noShowCount) return b.noShowCount - a.noShowCount;
        if (a.phase !== b.phase) return a.phase - b.phase;
        if (a.block !== b.block) return a.block - b.block;
        return a.lot - b.lot;
      });

    return {
      monthStartsAtUtc: monthStart.toISOString(),
      nowUtc: now.toISOString(),
      suspended,
    };
  }),
});
