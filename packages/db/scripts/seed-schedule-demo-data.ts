/**
 * Seeds demo reservations for Manila-calendar days: −2 … +2 relative to «today» in Asia/Manila.
 * Addresses use phase/block/lot integers in 1..10 only. Idempotent via ON CONFLICT DO NOTHING.
 * Each row: crypto-random homeowner/name/contact, ~26% no-show rate (Binomial mix per run), pickle slots are a random ½ of the grid.
 *
 * Run (from repo root or packages/db): server `.env` must define DATABASE_URL.
 *   bun run --cwd packages/db --env-file=../../apps/server/.env db:seed:schedule-demo
 */
import { randomInt, randomUUID } from "node:crypto";
import { resolve } from "node:path";

import { config } from "dotenv";
import { and, eq, type InferInsertModel } from "drizzle-orm";

config({ path: resolve(import.meta.dir, "../../../apps/server/.env") });

const MANILA_OFFSET = "+08:00" as const;
const TENNIS_HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const;
const PICKLE_HOURS = [16, 17, 18, 19, 20, 21] as const;
const PICKLE_BERTHS = [1, 2, 3, 4] as const;

const NAMES = [
  "Ana Ramos",
  "Miguel Cruz",
  "Sofia Lim",
  "James Ong",
  "Rina Patel",
  "Carlos Reyes",
  "Lisa Tan",
  "Ben Cho",
  "Nina Alvarez",
  "Omar Hussain",
  "Grace Villanueva",
  "Jordan Lee",
  "Priya Nair",
  "Tomás Fernández",
  "Yuki Morales",
  "Daniel Okonkwo",
  "Karen Wu",
  "Diego Santos",
  "Hannah Kim",
  "Marcus Webb",
] as const;

function formatManilaYmd(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function shiftManilaYmd(baseYmd: string, deltaDays: number): string {
  const t = new Date(`${baseYmd}T00:00:00${MANILA_OFFSET}`);
  t.setTime(t.getTime() + deltaDays * 86_400_000);
  return formatManilaYmd(t);
}

function manilaTennisSlotStart(dateYmd: string, slotHour: number): Date {
  const h = String(slotHour).padStart(2, "0");
  return new Date(`${dateYmd}T${h}:00:00${MANILA_OFFSET}`);
}

function manilaPickleSlotStart(dateYmd: string, slotHour: number): Date {
  const h = String(slotHour).padStart(2, "0");
  return new Date(`${dateYmd}T${h}:00:00${MANILA_OFFSET}`);
}

/** Target fraction marked no-show (each row is an independent draw). */
const NO_SHOW_FRACTION = 0.26;

function randomElement<T>(arr: readonly T[]): T {
  return arr[randomInt(arr.length)]!;
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

function randomNoShow(): boolean {
  const threshold = Math.floor(NO_SHOW_FRACTION * 1000);
  return randomInt(1000) < threshold;
}

function randomContact(): string {
  const n = randomInt(900_000_000, 1_000_000_000);
  return `+63${n}`;
}

async function main() {
  const [{ createDb }, { homeowners }, { tennisReservations }, { pickleballReservations }] =
    await Promise.all([
      import("../src/index"),
      import("../src/schema/homeowners"),
      import("../src/schema/tennis"),
      import("../src/schema/pickleball"),
    ]);

  const db = createDb();

  const addresses: { phase: number; block: number; lot: number }[] = [];
  for (let p = 1; p <= 10; p++) {
    for (let b = 1; b <= 10; b++) {
      for (let l = 1; l <= 10; l++) {
        addresses.push({ phase: p, block: b, lot: l });
      }
    }
  }

  async function getOrCreateHomeownerId(triple: { phase: number; block: number; lot: number }) {
    await db
      .insert(homeowners)
      .values(triple)
      .onConflictDoNothing({ target: [homeowners.phase, homeowners.block, homeowners.lot] });
    const [row] = await db
      .select({ id: homeowners.id })
      .from(homeowners)
      .where(
        and(eq(homeowners.phase, triple.phase), eq(homeowners.block, triple.block), eq(homeowners.lot, triple.lot)),
      )
      .limit(1);
    if (!row) {
      throw new Error(`Could not resolve homeowner for ${triple.phase}-${triple.block}-${triple.lot}`);
    }
    return row.id;
  }

  const todayManila = formatManilaYmd(new Date());
  const dates = [-2, -1, 0, 1, 2].map((d) => shiftManilaYmd(todayManila, d));

  const tennisRows: InferInsertModel<typeof tennisReservations>[] = [];
  for (const dateYmd of dates) {
    for (const hour of TENNIS_HOURS) {
      const slotStart = manilaTennisSlotStart(dateYmd, hour);
      const addr = randomElement(addresses);
      const homeownerId = await getOrCreateHomeownerId(addr);
      tennisRows.push({
        id: randomUUID(),
        slotStart,
        homeownerId,
        reservedByName: randomElement(NAMES),
        reservedByContact: randomContact(),
        noShow: randomNoShow(),
        createdByUserId: null,
      });
    }
  }

  const pickleCandidates: Array<{ dateYmd: string; hour: number; berth: number }> = [];
  for (const dateYmd of dates) {
    for (const hour of PICKLE_HOURS) {
      for (const berth of PICKLE_BERTHS) {
        pickleCandidates.push({ dateYmd, hour, berth });
      }
    }
  }
  shuffleInPlace(pickleCandidates);
  /** Half of the 120 pickle cells, chosen at random. */
  const pickleChosen = pickleCandidates.slice(0, 60);

  const pickleRows: InferInsertModel<typeof pickleballReservations>[] = [];
  for (const { dateYmd, hour, berth } of pickleChosen) {
    const slotStart = manilaPickleSlotStart(dateYmd, hour);
    const addr = randomElement(addresses);
    const homeownerId = await getOrCreateHomeownerId(addr);
    pickleRows.push({
      id: randomUUID(),
      slotStart,
      courtBerth: berth,
      homeownerId,
      reservedByName: randomElement(NAMES),
      reservedByContact: randomContact(),
      noShow: randomNoShow(),
      createdByUserId: null,
    });
  }

  let tennisInserted = 0;
  let pickleInserted = 0;

  shuffleInPlace(tennisRows);
  shuffleInPlace(pickleRows);

  for (let i = 0; i < tennisRows.length; i += 50) {
    const chunk = tennisRows.slice(i, i + 50);
    const r = await db
      .insert(tennisReservations)
      .values(chunk)
      .onConflictDoNothing({ target: tennisReservations.slotStart })
      .returning({ slotStart: tennisReservations.slotStart });
    tennisInserted += r.length;
  }

  for (let i = 0; i < pickleRows.length; i += 80) {
    const chunk = pickleRows.slice(i, i + 80);
    const r = await db
      .insert(pickleballReservations)
      .values(chunk)
      .onConflictDoNothing({ target: [pickleballReservations.slotStart, pickleballReservations.courtBerth] })
      .returning({ id: pickleballReservations.id });
    pickleInserted += r.length;
  }

  const tennisNoShows = tennisRows.reduce((n, r) => n + (r.noShow ? 1 : 0), 0);
  const pickleNoShows = pickleRows.reduce((n, r) => n + (r.noShow ? 1 : 0), 0);

  const attempted = tennisRows.length + pickleRows.length;
  const inserted = tennisInserted + pickleInserted;
  console.info(`Manila calendar days: ${dates.join(", ")} (today Manila: ${todayManila})`);
  console.info(`Tennis reservations: inserted ${tennisInserted} / attempted ${tennisRows.length} (no-shows in batch: ${tennisNoShows})`);
  console.info(`Pickleball reservations: inserted ${pickleInserted} / attempted ${pickleRows.length} (no-shows in batch: ${pickleNoShows})`);
  console.info(`Total inserted this run: ${inserted} (attempted pairs: ${attempted}); re-run skips conflicts.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
