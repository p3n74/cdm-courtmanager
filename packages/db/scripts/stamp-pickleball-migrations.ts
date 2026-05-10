/**
 * Stamp pickleball migrations (0004–0005) into `drizzle.__drizzle_migrations` when
 * `public.pickleball_reservations` already exists (e.g. created with `db:push`) but migrate
 * was never applied for those hashes. After this succeeds, run `bun run db:migrate`.
 *
 * Uses the same SHA-256 hashing as Drizzle reads from `{tag}.sql` + `meta/_journal.json`.
 *
 * Usage: `cd packages/db && bun --env-file=../../apps/server/.env run scripts/stamp-pickleball-migrations.ts`
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "../src/migrations");
const journalPath = path.join(migrationsDir, "meta/_journal.json");

const TAGS = ["0004_pickleball_reservations", "0005_woozy_captain_flint"] as const;

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "DATABASE_URL is not set. Use: cd packages/db && bun --env-file=../../apps/server/.env run scripts/stamp-pickleball-migrations.ts",
  );
  process.exit(1);
}

function sha256MigrationFile(sqlPath: string): string {
  const query = fs.readFileSync(sqlPath).toString();
  return crypto.createHash("sha256").update(query).digest("hex");
}

async function main() {
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8")) as {
    entries: { idx: number; tag: string; when: number }[];
  };

  const byTag = new Map<string, { when: number }>();
  for (const e of journal.entries) {
    byTag.set(e.tag, { when: e.when });
  }

  const stamped: { tag: string; hash: string; when: number }[] = [];
  for (const tag of TAGS) {
    const meta = byTag.get(tag);
    if (!meta) {
      console.error(`Journal missing tag ${tag}`);
      process.exit(1);
    }
    const sqlPath = path.join(migrationsDir, `${tag}.sql`);
    if (!fs.existsSync(sqlPath)) {
      console.error(`Missing migration file ${sqlPath}`);
      process.exit(1);
    }
    stamped.push({ tag, hash: sha256MigrationFile(sqlPath), when: meta.when });
  }

  const pool = new pg.Pool({ connectionString: url });

  try {
    const {
      rows: [{ exists }],
    } = await pool.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'pickleball_reservations'
      ) AS exists`,
    );

    if (!exists) {
      console.error(
        "Table public.pickleball_reservations does not exist. Run bun run db:migrate first instead of stamping.",
      );
      process.exit(1);
    }

    const { rows: existing } = await pool.query<{ hash: string }>(
      `SELECT hash FROM drizzle.__drizzle_migrations`,
    );
    const have = new Set(existing.map((r) => r.hash));

    await pool.query("BEGIN");
    try {
      let inserted = 0;
      for (const { hash, when } of stamped) {
        if (have.has(hash)) {
          continue;
        }
        await pool.query(
          `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
          [hash, when],
        );
        inserted++;
        have.add(hash);
      }

      await pool.query("COMMIT");

      if (inserted === 0) {
        console.log(
          "All pickleball migration hashes are already recorded. Nothing to do. Next: bun run db:migrate",
        );
      } else {
        console.log(`Recorded ${inserted} migration hash(es) for pickleball SQL files. Next: bun run db:migrate`);
      }
    } catch (e) {
      await pool.query("ROLLBACK");
      throw e;
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
