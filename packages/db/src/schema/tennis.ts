import { sql } from "drizzle-orm";
import { boolean, check, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { homeowners } from "./homeowners";

/** Emails (lowercase) allowed to access reservation management (Google sign-in). */
export const tennisReservationManagerAllowlist = pgTable(
  "tennis_reservation_manager_allowlist",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
);

/**
 * One row = one court booked for a 1-hour slot in Asia/Manila (06:00–16:00 wall clock, starts 06–15 inclusive).
 * `slot_start` is the instant when the hour begins; end is implicit (+1 hour).
 */
export const tennisReservations = pgTable(
  "tennis_reservations",
  {
    id: text("id").primaryKey(),
    /** Instant start of the reservation hour (stored as timestamptz; interpreted in Philippines via check). */
    slotStart: timestamp("slot_start", { withTimezone: true, mode: "date" }).notNull().unique(),
    homeownerId: uuid("homeowner_id").references(() => homeowners.id, { onDelete: "restrict" }),
    /** Who this specific booking is for; not stored on `homeowners` (can differ each time). */
    reservedByName: text("reserved_by_name").notNull(),
    reservedByContact: text("reserved_by_contact").notNull(),
    noShow: boolean("no_show").default(false).notNull(),
    createdByUserId: text("created_by_user_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    check(
      "tennis_reservations_slot_manila_wall_clock",
      sql`
        EXTRACT(MINUTE FROM (${table.slotStart} AT TIME ZONE 'Asia/Manila')) = 0
        AND EXTRACT(SECOND FROM (${table.slotStart} AT TIME ZONE 'Asia/Manila')) = 0
        AND EXTRACT(HOUR FROM (${table.slotStart} AT TIME ZONE 'Asia/Manila')) >= 6
        AND EXTRACT(HOUR FROM (${table.slotStart} AT TIME ZONE 'Asia/Manila')) <= 15
      `,
    ),
  ],
);
