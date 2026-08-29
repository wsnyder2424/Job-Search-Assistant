/**
 * Core domain types.
 *
 * This module (and everything else under `src/core`) is deliberately free of
 * React, Next, DOM and Node APIs so that a future React Native client can
 * import it unchanged. Keep it that way: pure data and pure functions only.
 */

/** How often a medication is given. */
export type Frequency =
  /** Every `hours` hours, anchored to the medication's start time. */
  | { kind: "interval_hours"; hours: number }
  /** At specific wall-clock times every day, e.g. ["08:00", "20:00"]. */
  | { kind: "daily_at"; times: TimeOfDay[] }
  /** At specific times, but only every `days` days counted from the start day. */
  | { kind: "every_n_days"; days: number; times: TimeOfDay[] }
  /** At specific times on specific weekdays (0 = Sunday ... 6 = Saturday). */
  | { kind: "weekly_on"; daysOfWeek: Weekday[]; times: TimeOfDay[] }
  /** Given only when needed — never appears on the schedule. */
  | { kind: "as_needed" };

export type FrequencyKind = Frequency["kind"];

/** A wall-clock time of day in 24-hour "HH:MM" form. */
export type TimeOfDay = string;

/** 0 = Sunday, 6 = Saturday — matches Date.prototype.getDay(). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Pet {
  id: string;
  householdId: string;
  name: string;
  species: string | null;
  createdAt: string;
}

export interface Medication {
  id: string;
  petId: string;
  name: string;
  /** Free-text directions, e.g. "1 tablet with food". */
  directions: string | null;
  frequency: Frequency;
  /** ISO instant of the first dose. */
  startAt: string;
  /** ISO instant after which the course is finished, or null for ongoing. */
  endAt: string | null;
  /** Palette id from `colors.ts` — how the med is identified at a glance. */
  colorId: string;
  archived: boolean;
  createdAt: string;
}

/** A recorded administration of a scheduled dose. */
export interface Dose {
  id: string;
  medicationId: string;
  /** ISO instant of the scheduled slot this dose fills. */
  scheduledFor: string;
  /** ISO instant it was actually given. */
  givenAt: string;
  /** User id of whoever checked it off. */
  givenBy: string;
  givenByName: string | null;
  notes: string | null;
}

/**
 * One slot on the schedule. Occurrences are derived from the medication's
 * frequency rather than stored, so changing a frequency reshapes the future
 * schedule without a backfill. Only *given* doses are persisted.
 */
export interface Occurrence {
  /** Stable identity for a slot: `${medicationId}|${scheduledFor}`. */
  key: string;
  medicationId: string;
  /** ISO instant this dose is due. */
  scheduledFor: string;
}

/** An occurrence joined with its medication, pet, and dose record (if given). */
export interface ScheduleEntry extends Occurrence {
  medication: Medication;
  pet: Pet;
  dose: Dose | null;
  status: DoseStatus;
}

export type DoseStatus = "given" | "due" | "overdue" | "upcoming";

export interface HouseholdMember {
  userId: string;
  householdId: string;
  displayName: string | null;
  role: "owner" | "caregiver";
}
