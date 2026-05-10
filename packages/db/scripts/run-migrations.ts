/**
 * Run SQL migrations with clear error output.
 *
 * `drizzle-kit migrate` often exits with code 1 without printing the underlying DB error because
 * its progress UI ignores the rejection reason. This script calls the same migrator Drizzle uses
 * and logs failures to stderr.
 *
 * Usage (from repo root): `bun run db:migrate`
 * Or: `cd packages/db && bun --env-file=../../apps/server/.env run scripts/run-migrations.ts`
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.join(__dirname, "../src/migrations");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "DATABASE_URL is not set. Use: cd packages/db && bun --env-file=../../apps/server/.env run scripts/run-migrations.ts",
  );
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url });
const db = drizzle(pool);

try {
  console.log(`Applying migrations from ${migrationsFolder}`);
  await migrate(db, {
    migrationsFolder,
    migrationsSchema: "drizzle",
  });
  console.log("Migrations applied successfully.");
} catch (e) {
  console.error("Migration failed:");
  console.error(e);
  const msg = e instanceof Error ? e.message + (e.cause instanceof Error ? `\nCause: ${e.cause.message}` : "") : String(e);
  if (msg.includes("already exists")) {
    console.error(
      "\nIf this is pickleball-related and the table matches your migrations, stamp hashes then re-run migrations:\n" +
        "  bun run db:stamp-pickleball-migrations\n" +
        "  bun run db:migrate\n" +
        "Only stamp when schema already matches migration SQL.",
    );
  }
  process.exit(1);
} finally {
  await pool.end();
}
