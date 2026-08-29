/**
 * Timezone-aware wall-clock helpers built on Intl, so "8:00 AM every day"
 * stays 8:00 AM across a DST boundary. No date library, no Node/DOM APIs.
 */

export interface WallClock {
  year: number;
  /** 1-12. */
  month: number;
  /** 1-31. */
  day: number;
  hour: number;
  minute: number;
}

const PARTS_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let fmt = PARTS_FORMATTER_CACHE.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    PARTS_FORMATTER_CACHE.set(timeZone, fmt);
  }
  return fmt;
}

/** The wall-clock reading a given instant produces in `timeZone`. */
export function toWallClock(instant: Date, timeZone: string): WallClock {
  const parts = partsFormatter(timeZone).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((p) => p.type === type);
    return part ? Number(part.value) : 0;
  };
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

/** Offset (ms) of `timeZone` from UTC at a given instant. */
function offsetMsAt(instant: Date, timeZone: string): number {
  const wall = toWallClock(instant, timeZone);
  const parts = partsFormatter(timeZone).formatToParts(instant);
  const second = Number(parts.find((p) => p.type === "second")?.value ?? 0);
  const asIfUtc = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
    second,
  );
  // Millisecond component is unaffected by the zone, so drop it from both sides.
  return asIfUtc - (instant.getTime() - instant.getUTCMilliseconds());
}

/**
 * The instant at which `wall` occurs in `timeZone`.
 *
 * Offsets are resolved iteratively because the correct offset depends on the
 * instant we are solving for. Two passes settle every real-world zone,
 * including DST transitions; times inside a spring-forward gap resolve to the
 * instant the clock jumps to.
 */
export function fromWallClock(wall: WallClock, timeZone: string): Date {
  const naiveUtc = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
  );
  let offset = offsetMsAt(new Date(naiveUtc), timeZone);
  let instant = naiveUtc - offset;
  const settled = offsetMsAt(new Date(instant), timeZone);
  if (settled !== offset) {
    offset = settled;
    instant = naiveUtc - offset;
  }
  return new Date(instant);
}

/** Parse "HH:MM" into hour/minute. Throws on malformed input. */
export function parseTimeOfDay(time: string): { hour: number; minute: number } {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) throw new Error(`Invalid time of day: "${time}" (expected HH:MM)`);
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) {
    throw new Error(`Invalid time of day: "${time}"`);
  }
  return { hour, minute };
}

/** Format hour/minute as "HH:MM". */
export function formatTimeOfDay(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Render "HH:MM" in the friendlier 12-hour form, e.g. "8:00 AM". */
export function formatTimeOfDayLabel(time: string): string {
  const { hour, minute } = parseTimeOfDay(time);
  const suffix = hour < 12 ? "AM" : "PM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

/** Days since the epoch for a wall-clock date — used for day-interval math. */
export function toDayNumber(wall: WallClock): number {
  return Math.floor(Date.UTC(wall.year, wall.month - 1, wall.day) / 86_400_000);
}

/** Inverse of `toDayNumber`. */
export function fromDayNumber(dayNumber: number): {
  year: number;
  month: number;
  day: number;
} {
  const date = new Date(dayNumber * 86_400_000);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

/** Weekday (0 = Sunday) of a wall-clock date. */
export function weekdayOf(wall: WallClock): number {
  return new Date(
    Date.UTC(wall.year, wall.month - 1, wall.day),
  ).getUTCDay();
}

/** The device's IANA timezone, falling back to UTC where unavailable. */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
