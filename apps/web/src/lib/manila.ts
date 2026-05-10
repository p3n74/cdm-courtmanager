/** Aligns with server: court slots are whole hours in Asia/Manila from 06:00 through 15:00 start (ends 16:00). */
export const MANILA_OFFSET = "+08:00";

export const SLOT_HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const;

/** Pickleball: 16:00–22:00 Manila (hour starts 16–21). */
export const PICKLEBALL_SLOT_HOURS = [16, 17, 18, 19, 20, 21] as const;

const manilaWallClockFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** Formats a Manila wall-clock hour integer (e.g. 6 → "6:00 AM"). */
export function formatManilaWallHourStart(slotHour: number): string {
  const h = String(slotHour).padStart(2, "0");
  return manilaWallClockFormatter.format(new Date(`2000-01-01T${h}:00:00${MANILA_OFFSET}`));
}

/** One-hour block label, e.g. "6:00 AM–7:00 AM". */
export function formatSlotRangeLabel(slotHour: number): string {
  return `${formatManilaWallHourStart(slotHour)}–${formatManilaWallHourStart(slotHour + 1)}`;
}

/** Full-day window for blurbs, e.g. tennis 6:00 AM–4:00 PM. */
export function formatCourtDayWindowLabel(startHour: number, endHourExclusive: number): string {
  return `${formatManilaWallHourStart(startHour)}–${formatManilaWallHourStart(endHourExclusive)}`;
}

export function tennisCourtDayWindowLabel(): string {
  return formatCourtDayWindowLabel(SLOT_HOURS[0], SLOT_HOURS[SLOT_HOURS.length - 1] + 1);
}

export function pickleballCourtDayWindowLabel(): string {
  return formatCourtDayWindowLabel(
    PICKLEBALL_SLOT_HOURS[0],
    PICKLEBALL_SLOT_HOURS[PICKLEBALL_SLOT_HOURS.length - 1] + 1,
  );
}

const ymdFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function formatManilaYmd(date: Date): string {
  return ymdFormatter.format(date);
}

const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "long",
  day: "numeric",
});

/** `dateYmd` is a Manila calendar date (YYYY-MM-DD). */
export function formatManilaLongDate(dateYmd: string): string {
  const noon = `${dateYmd}T12:00:00${MANILA_OFFSET}`;
  return longDateFormatter.format(new Date(noon));
}

export function manilaSlotStartUtc(dateYmd: string, slotHour: number): Date {
  const h = String(slotHour).padStart(2, "0");
  return new Date(`${dateYmd}T${h}:00:00${MANILA_OFFSET}`);
}

export function manilaPickleballSlotStartUtc(dateYmd: string, slotHour: number): Date {
  if (
    typeof slotHour !== "number" ||
    !Number.isInteger(slotHour) ||
    slotHour < PICKLEBALL_SLOT_HOURS[0] ||
    slotHour > PICKLEBALL_SLOT_HOURS[PICKLEBALL_SLOT_HOURS.length - 1]
  ) {
    throw new Error(
      `slotHour must be between ${PICKLEBALL_SLOT_HOURS[0]} and ${PICKLEBALL_SLOT_HOURS[PICKLEBALL_SLOT_HOURS.length - 1]} for pickleball (Asia/Manila).`,
    );
  }
  const h = String(slotHour).padStart(2, "0");
  return new Date(`${dateYmd}T${h}:00:00${MANILA_OFFSET}`);
}

export function formatReservationSlotLabel(slotStart: Date | string): string {
  const d = typeof slotStart === "string" ? new Date(slotStart) : slotStart;
  const ymd = formatManilaYmd(d);
  const hourRaw = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    hour12: false,
  }).format(d);
  const hour = Number.parseInt(hourRaw, 10);
  const isKnownHour =
    Number.isFinite(hour) &&
    ((SLOT_HOURS as readonly number[]).includes(hour) ||
      (PICKLEBALL_SLOT_HOURS as readonly number[]).includes(hour));
  const timePart = isKnownHour
    ? formatSlotRangeLabel(hour)
    : manilaWallClockFormatter.format(d);
  return `${formatManilaLongDate(ymd)} · ${timePart}`;
}
