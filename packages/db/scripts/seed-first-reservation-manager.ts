import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import { config } from "dotenv";
import { eq } from "drizzle-orm";

// Dotenv must run before importing ../src/index (that pulls @cdm-pickleball/env/server, which validates on load).
config({ path: resolve(import.meta.dir, "../../../apps/server/.env") });

const [{ createDb }, { tennisReservationManagerAllowlist }] = await Promise.all([
  import("../src/index"),
  import("../src/schema/tennis"),
]);

const EMAIL = "firefallchallenger@gmail.com".toLowerCase();

const db = createDb();

const [existing] = await db
  .select({ id: tennisReservationManagerAllowlist.id })
  .from(tennisReservationManagerAllowlist)
  .where(eq(tennisReservationManagerAllowlist.email, EMAIL))
  .limit(1);

if (existing) {
  console.info(`Allowlist already contains ${EMAIL} (${existing.id})`);
  process.exit(0);
}

await db.insert(tennisReservationManagerAllowlist).values({
  id: randomUUID(),
  email: EMAIL,
});

console.info(`Inserted allowlist entry for ${EMAIL}`);
