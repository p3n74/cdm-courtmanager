/**
 * Sync `drizzle.__drizzle_migrations` with a database that was never migrated via
 * `drizzle-kit migrate` (e.g. created with `drizzle-kit push`).
 *
 * Also repairs the common broken state from `push` renaming `player_id` → `homeowner_id`
 * while keeping **text** type, which blocks a UUID foreign key to `homeowners.id`.
 *
 * After this script succeeds, run `bun run db:migrate` (should no-op if both journal
 * entries are recorded).
 *
 * Usage: bun --env-file=../../apps/server/.env run scripts/baseline-drizzle-migrations.ts
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "../src/migrations");
const journalPath = path.join(migrationsDir, "meta/_journal.json");

const FK_NAME = "tennis_reservations_homeowner_id_homeowners_id_fk";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

function sha256File(filePath: string): string {
  const query = fs.readFileSync(filePath).toString();
  return crypto.createHash("sha256").update(query).digest("hex");
}

async function columnUdt(client: pg.Pool | pg.PoolClient, column: string): Promise<string | null> {
  const { rows } = await client.query<{ udt_name: string }>(
    `
    SELECT udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tennis_reservations'
      AND column_name = $1
    `,
    [column],
  );
  return rows[0]?.udt_name ?? null;
}

const pool = new pg.Pool({ connectionString: url });

try {
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8")) as {
    entries: { idx: number; tag: string; when: number }[];
  };

  function entry(idx: number) {
    const e = journal.entries.find((it) => it.idx === idx);
    if (!e) throw new Error(`Journal missing idx ${idx}`);
    return e;
  }

  const e0 = entry(0);
  const e1 = entry(1);
  const hash0 = sha256File(path.join(migrationsDir, `${e0.tag}.sql`));
  const hash1 = sha256File(path.join(migrationsDir, `${e1.tag}.sql`));

  const c = await pool.connect();
  try {
    await c.query(`CREATE SCHEMA IF NOT EXISTS "drizzle"`);
    await c.query(`
      CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `);

    const { rows: acc } = await c.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'account'
      ) AS exists`,
    );
    if (!acc[0]?.exists) {
      console.error(
        "Expected public.account to exist. This script is only for DBs aligned with migration 0000.",
      );
      process.exit(1);
    }

    const { rows: hashes } = await c.query<{ hash: string }>(
      `SELECT hash FROM "drizzle"."__drizzle_migrations"`,
    );
    const recorded = new Set(hashes.map((r) => r.hash));
    const have0 = recorded.has(hash0);
    const have1 = recorded.has(hash1);
    if (have0 && have1) {
      console.log(
        "Both migrations are recorded in drizzle.__drizzle_migrations. Nothing to do.",
      );
      process.exit(0);
    }

    await c.query("BEGIN");

    const playerTy = await columnUdt(c, "player_id");
    const ownerTy = await columnUdt(c, "homeowner_id");

    /** `push` left `homeowner_id` as text → convert to UUID and add FK, then stamp 0000+0001. */
    const pushRenameTextBug = ownerTy === "text";
    /** Fresh pre-0001 layout from migration 0000 (still `player_id`). */
    const stillOnPlayerId = playerTy !== null && ownerTy === null;

    if (pushRenameTextBug) {
      try {
        await c.query(`
          ALTER TABLE "tennis_reservations"
            ALTER COLUMN "homeowner_id" DROP DEFAULT;

          ALTER TABLE "tennis_reservations"
            ALTER COLUMN "homeowner_id" TYPE uuid USING (
              CASE
                WHEN "homeowner_id" IS NULL OR TRIM(BTRIM("homeowner_id"::text)) = ''
                  THEN NULL
                ELSE TRIM(BTRIM("homeowner_id"::text))::uuid
              END
            )
        `);
      } catch (castErr) {
        await c.query("ROLLBACK");
        console.error(
          "Failed to cast tennis_reservations.homeowner_id from text to uuid (non-empty non-UUID values?):",
          castErr,
        );
        process.exit(1);
      }

      const {
        rows: [fkExists],
      } = await c.query<{ exists: boolean }>(
        `SELECT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = $1
        ) AS exists`,
        [FK_NAME],
      );
      if (!fkExists.exists) {
        await c.query(`
          ALTER TABLE "tennis_reservations"
          ADD CONSTRAINT "${FK_NAME}"
          FOREIGN KEY ("homeowner_id")
          REFERENCES "public"."homeowners"("id") ON DELETE restrict ON UPDATE NO ACTION
        `);
      }

      const { rows: homeownersExists } = await c.query<{ exists: boolean }>(
        `SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'homeowners'
        ) AS exists`,
      );
      if (!homeownersExists[0]?.exists) {
        throw new Error("Expected homeowners table after push repair path");
      }

      if (!have0) {
        await c.query(
          `INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at") VALUES ($1, $2)`,
          [hash0, e0.when],
        );
      }
      if (!have1) {
        await c.query(
          `INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at") VALUES ($1, $2)`,
          [hash1, e1.when],
        );
      }

      await c.query("COMMIT");
      console.log(
        "Repaired homeowner_id column type (text → uuid), ensured FK to homeowners, recorded migrations 0000 and 0001.",
      );
      process.exit(0);
    }

    if (stillOnPlayerId) {
      const {
        rows: [hmExists],
      } = await c.query<{ exists: boolean }>(
        `SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'homeowners'
        ) AS exists`,
      );
      if (hmExists?.exists) {
        await c.query("ROLLBACK");
        console.error(
          "Ambiguous schema: tennis_reservations still has player_id but homeowners table exists — fix manually.",
        );
        process.exit(1);
      }

      if (!have0) {
        await c.query(
          `INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at") VALUES ($1, $2)`,
          [hash0, e0.when],
        );
      }

      await c.query("COMMIT");
      console.log(
        `Recorded migration 0000 (created_at=${e0.when}). Next: bun run db:migrate to apply 0001.`,
      );
      process.exit(0);
    }

    await c.query("ROLLBACK");

    const ownerUuid = ownerTy === "uuid";
    const {
      rows: [fk],
    } = await c.query<{ exists: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = $1) AS exists`,
      [FK_NAME],
    );

    /**
     * DB already reflects 0001 (uuid + FK etc.) but journal rows missing — stamp both hashes.
     */
    if (ownerUuid && fk?.exists && !stillOnPlayerId) {
      const c2 = await pool.connect();
      try {
        await c2.query("BEGIN");
        if (!have0) {
          await c2.query(
            `INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at") VALUES ($1, $2)`,
            [hash0, e0.when],
          );
        }
        if (!have1) {
          await c2.query(
            `INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at") VALUES ($1, $2)`,
            [hash1, e1.when],
          );
        }
        await c2.query("COMMIT");
      } finally {
        c2.release();
      }
      console.log(
        "Schema already matched migrations; recorded missing rows in drizzle.__drizzle_migrations.",
      );
      process.exit(0);
    }

    console.error(
      "Unrecognized tennis_reservations column layout; open an issue or fix the DB manually.",
    );
    console.error({
      player_id: playerTy,
      homeowner_id: ownerTy,
      fk_homeowner: fk?.exists ?? false,
    });
    process.exit(1);
  } catch (e) {
    try {
      await c.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw e;
  } finally {
    c.release();
  }
} finally {
  await pool.end();
}
