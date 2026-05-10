import { integer, pgTable, unique, uuid } from "drizzle-orm/pg-core";

/**
 * Subdivision address identity: phase–block–lot (e.g. 1-1-1). One row per unique triple;
 * created when the first reservation is made for that address.
 */
export const homeowners = pgTable(
  "homeowners",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    phase: integer("phase").notNull(),
    block: integer("block").notNull(),
    lot: integer("lot").notNull(),
  },
  (t) => [unique("homeowners_phase_block_lot_unique").on(t.phase, t.block, t.lot)],
);
