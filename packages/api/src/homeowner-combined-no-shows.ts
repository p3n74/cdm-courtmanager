import { db } from "@cdm-pickleball/db";
import { pickleballReservations } from "@cdm-pickleball/db/schema/pickleball";
import { tennisReservations } from "@cdm-pickleball/db/schema/tennis";
import { and, eq, gte, lte } from "drizzle-orm";
import { count } from "drizzle-orm/sql/functions/aggregate";

/** Rows for merged no-show-only history tables (sport-specific reservations stay separate). */
export type CombinedNoShowHistoryItem =
  | {
      sport: "tennis";
      id: string;
      slotStart: Date;
      reservedByName: string;
      reservedByContact: string;
    }
  | {
      sport: "pickleball";
      id: string;
      slotStart: Date;
      courtBerth: number;
      reservedByName: string;
      reservedByContact: string;
    };

/** No-shows from the 1st of the Manila month through `now` (same window as booking warnings). */
export async function countCombinedNoShowsInManilaCalendarMonth(
  homeownerId: string,
  monthStart: Date,
  now: Date,
): Promise<number> {
  const [tennisAgg] = await db
    .select({ c: count() })
    .from(tennisReservations)
    .where(
      and(
        eq(tennisReservations.homeownerId, homeownerId),
        eq(tennisReservations.noShow, true),
        gte(tennisReservations.slotStart, monthStart),
        lte(tennisReservations.slotStart, now),
      ),
    );
  const [pickleAgg] = await db
    .select({ c: count() })
    .from(pickleballReservations)
    .where(
      and(
        eq(pickleballReservations.homeownerId, homeownerId),
        eq(pickleballReservations.noShow, true),
        gte(pickleballReservations.slotStart, monthStart),
        lte(pickleballReservations.slotStart, now),
      ),
    );
  return Number(tennisAgg?.c ?? 0) + Number(pickleAgg?.c ?? 0);
}

/** All-time no-shows for a homeowner across both courts, newest first (capped). */
export async function fetchCombinedNoShowHistory(
  homeownerId: string,
  limit: number,
): Promise<CombinedNoShowHistoryItem[]> {
  const tennisRows = await db
    .select({
      id: tennisReservations.id,
      slotStart: tennisReservations.slotStart,
      reservedByName: tennisReservations.reservedByName,
      reservedByContact: tennisReservations.reservedByContact,
    })
    .from(tennisReservations)
    .where(and(eq(tennisReservations.homeownerId, homeownerId), eq(tennisReservations.noShow, true)));

  const pickleRows = await db
    .select({
      id: pickleballReservations.id,
      slotStart: pickleballReservations.slotStart,
      courtBerth: pickleballReservations.courtBerth,
      reservedByName: pickleballReservations.reservedByName,
      reservedByContact: pickleballReservations.reservedByContact,
    })
    .from(pickleballReservations)
    .where(and(eq(pickleballReservations.homeownerId, homeownerId), eq(pickleballReservations.noShow, true)));

  const merged: CombinedNoShowHistoryItem[] = [
    ...tennisRows.map((r) => ({
      sport: "tennis" as const,
      id: r.id,
      slotStart: r.slotStart,
      reservedByName: r.reservedByName,
      reservedByContact: r.reservedByContact,
    })),
    ...pickleRows.map((r) => ({
      sport: "pickleball" as const,
      id: r.id,
      slotStart: r.slotStart,
      courtBerth: r.courtBerth,
      reservedByName: r.reservedByName,
      reservedByContact: r.reservedByContact,
    })),
  ];

  merged.sort((a, b) => {
    const t = b.slotStart.getTime() - a.slotStart.getTime();
    if (t !== 0) return t;
    if (a.sport !== b.sport) return a.sport.localeCompare(b.sport);
    return a.id.localeCompare(b.id);
  });

  return merged.slice(0, limit);
}
