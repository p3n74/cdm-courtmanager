import { sql } from "drizzle-orm";
import { boolean, check, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { homeowners } from "./homeowners";

/**
 * One row = one pickleball booking in a Manila wall-clock hour slot (starts 16:00–21:00 inclusive; ends 22:00).
 * Up to **four** active bookings share the same `slot_start` via `court_berth` 1–4.
 */
export const pickleballReservations = pgTable(
  "pickleball_reservations",
  {
    id: text("id").primaryKey(),
    slotStart: timestamp("slot_start", { withTimezone: true, mode: "date" }).notNull(),
    courtBerth: integer("court_berth").notNull(),
    homeownerId: uuid("homeowner_id").references(() => homeowners.id, { onDelete: "restrict" }),
    reservedByName: text("reserved_by_name").notNull(),
    reservedByContact: text("reserved_by_contact").notNull(),
    noShow: boolean("no_show").default(false).notNull(),
    createdByUserId: text("created_by_user_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    unique("pickleball_reservations_slot_berth_unique").on(table.slotStart, table.courtBerth),
    check(
      "pickleball_reservations_manila_hours",
      sql`
        EXTRACT(MINUTE FROM (${table.slotStart} AT TIME ZONE 'Asia/Manila')) = 0
        AND EXTRACT(SECOND FROM (${table.slotStart} AT TIME ZONE 'Asia/Manila')) = 0
        AND EXTRACT(HOUR FROM (${table.slotStart} AT TIME ZONE 'Asia/Manila')) >= 16
        AND EXTRACT(HOUR FROM (${table.slotStart} AT TIME ZONE 'Asia/Manila')) <= 21
      `,
    ),
    check("pickleball_reservations_court_berth_ok", sql`${table.courtBerth} >= 1 AND ${table.courtBerth} <= 4`),
  ],
);
