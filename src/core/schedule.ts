import type {
  Dose,
  DoseStatus,
  Frequency,
  Medication,
  Occurrence,
  Pet,
  ScheduleEntry,
} from "./types";
import {
  fromDayNumber,
  fromWallClock,
  parseTimeOfDay,
  toDayNumber,
  toWallClock,
  weekdayOf,
} from "./time";

/** A dose is "due" (rather than merely upcoming) within this window. */
export const DUE_SOON_MS = 30 * 60 * 1000;
/** Past this much after its slot, an unchecked dose reads as overdue. */
export const OVERDUE_GRACE_MS = 15 * 60 * 1000;

/** Guard against a runaway frequency filling memory. */
const MAX_OCCURRENCES = 500;

export function occurrenceKey(medicationId: string, scheduledFor: string): string {
  return `${medicationId}|${scheduledFor}`;
}

export interface OccurrenceWindow {
  /** Inclusive lower bound. */
  from: Date;
  /** Exclusive upper bound. */
  to: Date;
  /** IANA timezone the wall-clock times are interpreted in. */
  timeZone: string;
}

/**
 * Expand a medication's frequency into the concrete slots that fall inside
 * `window`. Occurrences are derived rather than stored, so editing a
 * medication reshapes its future schedule with no backfill.
 */
export function generateOccurrences(
  medication: Medication,
  window: OccurrenceWindow,
): Occurrence[] {
  if (medication.archived) return [];

  const startAt = new Date(medication.startAt);
  if (Number.isNaN(startAt.getTime())) return [];
  const endAt = medication.endAt ? new Date(medication.endAt) : null;

  const lowerBound = new Date(Math.max(window.from.getTime(), startAt.getTime()));
  const upperBound = endAt
    ? new Date(Math.min(window.to.getTime(), endAt.getTime()))
    : window.to;
  if (lowerBound >= upperBound) return [];

  const instants =
    medication.frequency.kind === "interval_hours"
      ? intervalInstants(medication.frequency, startAt, lowerBound, upperBound)
      : calendarInstants(
          medication.frequency,
          startAt,
          lowerBound,
          upperBound,
          window.timeZone,
        );

  return instants.map((instant) => {
    const scheduledFor = instant.toISOString();
    return {
      key: occurrenceKey(medication.id, scheduledFor),
      medicationId: medication.id,
      scheduledFor,
    };
  });
}

function intervalInstants(
  frequency: Extract<Frequency, { kind: "interval_hours" }>,
  startAt: Date,
  from: Date,
  to: Date,
): Date[] {
  const stepMs = frequency.hours * 60 * 60 * 1000;
  if (stepMs <= 0) return [];

  // Jump straight to the first slot at or after `from` instead of stepping.
  const elapsed = from.getTime() - startAt.getTime();
  const firstIndex = Math.max(0, Math.ceil(elapsed / stepMs));

  const instants: Date[] = [];
  for (let i = firstIndex; instants.length < MAX_OCCURRENCES; i += 1) {
    const time = startAt.getTime() + i * stepMs;
    if (time >= to.getTime()) break;
    instants.push(new Date(time));
  }
  return instants;
}

function calendarInstants(
  frequency: Frequency,
  startAt: Date,
  from: Date,
  to: Date,
  timeZone: string,
): Date[] {
  if (frequency.kind === "as_needed" || frequency.kind === "interval_hours") {
    return [];
  }

  const times = frequency.times.map(parseTimeOfDay);
  const startDay = toDayNumber(toWallClock(startAt, timeZone));
  const firstDay = toDayNumber(toWallClock(from, timeZone));
  const lastDay = toDayNumber(toWallClock(to, timeZone));

  const instants: Date[] = [];
  for (let day = firstDay; day <= lastDay; day += 1) {
    if (day < startDay) continue;

    if (frequency.kind === "every_n_days") {
      if ((day - startDay) % frequency.days !== 0) continue;
    }

    const date = fromDayNumber(day);

    if (frequency.kind === "weekly_on") {
      const weekday = weekdayOf({ ...date, hour: 0, minute: 0 });
      if (!frequency.daysOfWeek.includes(weekday as 0)) continue;
    }

    for (const { hour, minute } of times) {
      const instant = fromWallClock({ ...date, hour, minute }, timeZone);
      if (instant < from || instant >= to) continue;
      if (instant < startAt) continue;
      instants.push(instant);
      if (instants.length >= MAX_OCCURRENCES) break;
    }
    if (instants.length >= MAX_OCCURRENCES) break;
  }

  return instants.sort((a, b) => a.getTime() - b.getTime());
}

/** Classify a slot for display. */
export function doseStatus(
  scheduledFor: string,
  dose: Dose | null,
  now: Date,
): DoseStatus {
  if (dose) return "given";
  const due = new Date(scheduledFor).getTime();
  const delta = due - now.getTime();
  if (delta < -OVERDUE_GRACE_MS) return "overdue";
  if (delta <= DUE_SOON_MS) return "due";
  return "upcoming";
}

export interface BuildScheduleInput {
  medications: Medication[];
  pets: Pet[];
  /** Recorded doses; matched to slots by medication id + scheduled instant. */
  doses: Dose[];
  window: OccurrenceWindow;
  now: Date;
}

/**
 * The home screen's data shape: every slot in the window, joined with its
 * medication, pet, and dose record, sorted soonest-first.
 */
export function buildSchedule(input: BuildScheduleInput): ScheduleEntry[] {
  const petsById = new Map(input.pets.map((pet) => [pet.id, pet]));
  const dosesByKey = new Map(
    input.doses.map((dose) => [
      occurrenceKey(dose.medicationId, new Date(dose.scheduledFor).toISOString()),
      dose,
    ]),
  );

  const entries: ScheduleEntry[] = [];
  for (const medication of input.medications) {
    const pet = petsById.get(medication.petId);
    if (!pet) continue;

    for (const occurrence of generateOccurrences(medication, input.window)) {
      const dose = dosesByKey.get(occurrence.key) ?? null;
      entries.push({
        ...occurrence,
        medication,
        pet,
        dose,
        status: doseStatus(occurrence.scheduledFor, dose, input.now),
      });
    }
  }

  return entries.sort(
    (a, b) =>
      new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime() ||
      a.medication.name.localeCompare(b.medication.name),
  );
}

/**
 * The next slot still needing attention — the one the home screen counts down
 * to. Overdue doses win over merely upcoming ones.
 */
export function nextActionable(entries: ScheduleEntry[]): ScheduleEntry | null {
  const outstanding = entries.filter((entry) => entry.status !== "given");
  if (outstanding.length === 0) return null;
  const overdue = outstanding.filter((entry) => entry.status === "overdue");
  if (overdue.length > 0) return overdue[overdue.length - 1];
  return outstanding[0];
}

/** Group schedule entries by local calendar day for sectioned rendering. */
export function groupByDay(
  entries: ScheduleEntry[],
  timeZone: string,
): { dayNumber: number; entries: ScheduleEntry[] }[] {
  const groups = new Map<number, ScheduleEntry[]>();
  for (const entry of entries) {
    const dayNumber = toDayNumber(
      toWallClock(new Date(entry.scheduledFor), timeZone),
    );
    const bucket = groups.get(dayNumber);
    if (bucket) bucket.push(entry);
    else groups.set(dayNumber, [entry]);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([dayNumber, dayEntries]) => ({ dayNumber, entries: dayEntries }));
}
