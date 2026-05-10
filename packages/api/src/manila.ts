/** Philippines local time for court hours and display (no DST). */
export const MANILA_OFFSET = "+08:00";

const ymdFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function formatManilaYmd(date: Date): string {
  return ymdFormatter.format(date);
}

/** Inclusive start hours shown on the grid: 06:00 through 15:00 Manila (slot ends 16:00). */
export const SLOT_HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const;

export function manilaSlotStartUtc(dateYmd: string, slotHour: number): Date {
  if (slotHour < 6 || slotHour > 15) {
    throw new Error("slotHour must be between 6 and 15 (Asia/Manila one-hour blocks).");
  }
  const h = String(slotHour).padStart(2, "0");
  return new Date(`${dateYmd}T${h}:00:00${MANILA_OFFSET}`);
}

export function manilaDayBoundsUtc(dateYmd: string): { start: Date; end: Date } {
  const start = new Date(`${dateYmd}T00:00:00${MANILA_OFFSET}`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/** First instant of the Manila calendar month containing `when`, through `when` (same month, inclusive). */
export function manilaCalendarMonthStartUtc(when: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(when);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  if (!y || !m) {
    throw new Error("Failed to resolve Manila calendar month boundary");
  }
  return new Date(`${y}-${m}-01T00:00:00${MANILA_OFFSET}`);
}

/** Manila wall-clock one-hour pickleball slots: 16:00 → 21:00 start (hour ends 22:00). */
export const PICKLEBALL_SLOT_HOURS = [16, 17, 18, 19, 20, 21] as const;

export function manilaPickleballSlotStartUtc(dateYmd: string, slotHour: number): Date {
  if (
    typeof slotHour !== "number" ||
    !Number.isInteger(slotHour) ||
    slotHour < PICKLEBALL_SLOT_HOURS[0] ||
    slotHour > PICKLEBALL_SLOT_HOURS[PICKLEBALL_SLOT_HOURS.length - 1]
  ) {
    throw new Error(
      `slotHour must be between ${PICKLEBALL_SLOT_HOURS[0]} and ${PICKLEBALL_SLOT_HOURS[PICKLEBALL_SLOT_HOURS.length - 1]} (Asia/Manila pickleball hours).`,
    );
  }
  const h = String(slotHour).padStart(2, "0");
  return new Date(`${dateYmd}T${h}:00:00${MANILA_OFFSET}`);
}
