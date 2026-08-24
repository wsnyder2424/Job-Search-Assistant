import type { Frequency, TimeOfDay, Weekday } from "./types";
import { formatTimeOfDay, formatTimeOfDayLabel, parseTimeOfDay } from "./time";

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** Human-readable summary, e.g. "Every 8 hours" or "Twice daily at 8:00 AM and 8:00 PM". */
export function describeFrequency(frequency: Frequency): string {
  switch (frequency.kind) {
    case "interval_hours":
      return frequency.hours === 24
        ? "Once daily"
        : `Every ${frequency.hours} ${frequency.hours === 1 ? "hour" : "hours"}`;
    case "daily_at":
      return `${countLabel(frequency.times.length)} daily at ${listTimes(frequency.times)}`;
    case "every_n_days":
      return frequency.days === 1
        ? `${countLabel(frequency.times.length)} daily at ${listTimes(frequency.times)}`
        : `Every ${frequency.days} days at ${listTimes(frequency.times)}`;
    case "weekly_on": {
      const days = frequency.daysOfWeek
        .slice()
        .sort((a, b) => a - b)
        .map((d) => WEEKDAY_NAMES[d])
        .join(", ");
      return `${days} at ${listTimes(frequency.times)}`;
    }
    case "as_needed":
      return "As needed";
  }
}

function countLabel(count: number): string {
  if (count === 1) return "Once";
  if (count === 2) return "Twice";
  return `${count}x`;
}

function listTimes(times: TimeOfDay[]): string {
  const labels = times.map(formatTimeOfDayLabel);
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

/**
 * Reject frequencies that would produce a nonsensical or unbounded schedule.
 * Returns an error message, or null when the frequency is usable.
 */
export function validateFrequency(frequency: Frequency): string | null {
  switch (frequency.kind) {
    case "interval_hours":
      if (!Number.isFinite(frequency.hours) || frequency.hours <= 0) {
        return "Interval must be a positive number of hours.";
      }
      if (frequency.hours > 24 * 90) {
        return "Interval must be 90 days or less.";
      }
      return null;
    case "daily_at":
    case "every_n_days":
    case "weekly_on": {
      if (frequency.times.length === 0) {
        return "Pick at least one time of day.";
      }
      for (const time of frequency.times) {
        try {
          parseTimeOfDay(time);
        } catch {
          return `"${time}" is not a valid time (use HH:MM).`;
        }
      }
      if (frequency.kind === "every_n_days") {
        if (!Number.isInteger(frequency.days) || frequency.days < 1) {
          return "Day interval must be a whole number of days, 1 or more.";
        }
        if (frequency.days > 365) return "Day interval must be a year or less.";
      }
      if (frequency.kind === "weekly_on" && frequency.daysOfWeek.length === 0) {
        return "Pick at least one day of the week.";
      }
      return null;
    }
    case "as_needed":
      return null;
    default:
      return "Unrecognized frequency.";
  }
}

/**
 * Spread `dosesPerDay` evenly across 24 hours starting from `firstTime`.
 * Used when someone picks "twice daily" and we need concrete clock times.
 */
export function spreadAcrossDay(
  firstTime: TimeOfDay,
  dosesPerDay: number,
): TimeOfDay[] {
  const { hour, minute } = parseTimeOfDay(firstTime);
  const stepMinutes = Math.round((24 * 60) / dosesPerDay);
  const times: TimeOfDay[] = [];
  for (let i = 0; i < dosesPerDay; i += 1) {
    const total = (hour * 60 + minute + stepMinutes * i) % (24 * 60);
    times.push(formatTimeOfDay(Math.floor(total / 60), total % 60));
  }
  return times.sort();
}

/**
 * Best-effort reading of a dosing phrase off a label, e.g. "give 1 tablet by
 * mouth every 12 hours" or "twice daily". Returns null when nothing matches,
 * so callers can fall back to asking the user.
 *
 * `anchorTime` supplies the clock time for phrasings that specify a rate but
 * not a time of day.
 */
export function parseFrequencyPhrase(
  phrase: string,
  anchorTime: TimeOfDay = "08:00",
): Frequency | null {
  const text = phrase.toLowerCase().replace(/\s+/g, " ").trim();
  if (!text) return null;

  if (/\b(as needed|prn|when needed|if needed)\b/.test(text)) {
    return { kind: "as_needed" };
  }

  // "every 8 hours", "q12h", "every 8-12 hours" (takes the shorter interval)
  const everyHours =
    /\bevery (\d+)(?:\s*(?:-|to)\s*\d+)? ?(?:hours?|hrs?|h)\b/.exec(text) ??
    /\bq ?(\d+) ?h\b/.exec(text);
  if (everyHours) {
    const hours = Number(everyHours[1]);
    if (hours > 0) return { kind: "interval_hours", hours };
  }

  // "every other day", "every 3 days"
  if (/\bevery other day\b/.test(text)) {
    return { kind: "every_n_days", days: 2, times: [anchorTime] };
  }
  const everyDays = /\bevery (\d+) days?\b/.exec(text);
  if (everyDays) {
    const days = Number(everyDays[1]);
    if (days > 0) return { kind: "every_n_days", days, times: [anchorTime] };
  }

  // "once a month", "monthly" — vets mean a 30-day cycle for flea/heartworm.
  if (/\b(once a month|monthly|every month)\b/.test(text)) {
    return { kind: "every_n_days", days: 30, times: [anchorTime] };
  }
  if (/\b(once a week|weekly|every week)\b/.test(text)) {
    return { kind: "every_n_days", days: 7, times: [anchorTime] };
  }

  // "twice daily", "3 times a day", "sid/bid/tid/qid"
  const perDayWords: Record<string, number> = {
    once: 1,
    twice: 2,
    thrice: 3,
    sid: 1,
    bid: 2,
    tid: 3,
    qid: 4,
  };
  for (const [word, count] of Object.entries(perDayWords)) {
    const pattern =
      word.length === 3
        ? new RegExp(`\\b${word}\\b`)
        : new RegExp(`\\b${word}\\b.*\\b(a|per|each) ?day\\b|\\b${word} daily\\b`);
    if (pattern.test(text)) {
      return { kind: "daily_at", times: spreadAcrossDay(anchorTime, count) };
    }
  }
  const timesPerDay =
    /\b(\d+) ?(?:x|times?) ?(?:a|per|each|\/) ?day\b/.exec(text) ??
    /\b(\d+) ?(?:x|times?) daily\b/.exec(text);
  if (timesPerDay) {
    const count = Number(timesPerDay[1]);
    if (count > 0 && count <= 12) {
      return { kind: "daily_at", times: spreadAcrossDay(anchorTime, count) };
    }
  }

  if (/\b(once daily|daily|each day|every day|q ?24 ?h)\b/.test(text)) {
    return { kind: "daily_at", times: [anchorTime] };
  }

  return null;
}

/** Convenience constructor used by the medication form. */
export function dailyFrequency(
  dosesPerDay: number,
  firstTime: TimeOfDay,
): Frequency {
  return { kind: "daily_at", times: spreadAcrossDay(firstTime, dosesPerDay) };
}

export const ALL_WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
export { WEEKDAY_NAMES };
