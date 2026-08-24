import type { Dose, Frequency, Medication, Pet } from "@/core";

/**
 * Row shapes as they come back from PostgREST, and the mapping to the domain
 * types in `src/core`. Keeping this in one place means the UI never has to
 * know about snake_case columns, and a native client can reuse `src/core`
 * with a different transport.
 */

export interface PetRow {
  id: string;
  household_id: string;
  name: string;
  species: string | null;
  created_at: string;
}

export interface MedicationRow {
  id: string;
  pet_id: string;
  name: string;
  directions: string | null;
  frequency: unknown;
  start_at: string;
  end_at: string | null;
  color_id: string;
  archived: boolean;
  created_at: string;
}

export interface DoseRow {
  id: string;
  medication_id: string;
  scheduled_for: string;
  given_at: string;
  given_by: string;
  notes: string | null;
  /**
   * Embedded profile. PostgREST returns an object for a to-one relation but
   * an array when it cannot infer cardinality, so both shapes are accepted.
   */
  profiles?: EmbeddedProfile;
}

export type EmbeddedProfile =
  | { display_name: string | null }
  | { display_name: string | null }[]
  | null;

/** Normalize an embedded to-one relation that may arrive as a 1-element array. */
export function displayNameOf(profile: EmbeddedProfile | undefined): string | null {
  if (!profile) return null;
  const record = Array.isArray(profile) ? profile[0] : profile;
  return record?.display_name ?? null;
}

export function toPet(row: PetRow): Pet {
  return {
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    species: row.species,
    createdAt: row.created_at,
  };
}

export function toMedication(row: MedicationRow): Medication {
  return {
    id: row.id,
    petId: row.pet_id,
    name: row.name,
    directions: row.directions,
    frequency: parseFrequency(row.frequency),
    startAt: row.start_at,
    endAt: row.end_at,
    colorId: row.color_id,
    archived: row.archived,
    createdAt: row.created_at,
  };
}

export function toDose(row: DoseRow): Dose {
  return {
    id: row.id,
    medicationId: row.medication_id,
    scheduledFor: row.scheduled_for,
    givenAt: row.given_at,
    givenBy: row.given_by,
    givenByName: displayNameOf(row.profiles),
    notes: row.notes,
  };
}

/**
 * `frequency` is a jsonb column, so it arrives as `unknown`. A row that
 * predates a schema change (or was written by hand) must not crash the whole
 * schedule, so anything unrecognized degrades to "as needed" — the medication
 * still appears in the app, it just stops generating slots.
 */
export function parseFrequency(value: unknown): Frequency {
  if (!value || typeof value !== "object") return { kind: "as_needed" };
  const candidate = value as Record<string, unknown>;

  switch (candidate.kind) {
    case "interval_hours":
      return typeof candidate.hours === "number" && candidate.hours > 0
        ? { kind: "interval_hours", hours: candidate.hours }
        : { kind: "as_needed" };
    case "daily_at":
      return isTimeArray(candidate.times)
        ? { kind: "daily_at", times: candidate.times }
        : { kind: "as_needed" };
    case "every_n_days":
      return isTimeArray(candidate.times) &&
        typeof candidate.days === "number" &&
        candidate.days >= 1
        ? { kind: "every_n_days", days: candidate.days, times: candidate.times }
        : { kind: "as_needed" };
    case "weekly_on":
      return isTimeArray(candidate.times) && isWeekdayArray(candidate.daysOfWeek)
        ? {
            kind: "weekly_on",
            daysOfWeek: candidate.daysOfWeek,
            times: candidate.times,
          }
        : { kind: "as_needed" };
    default:
      return { kind: "as_needed" };
  }
}

function isTimeArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((entry) => typeof entry === "string" && /^\d{1,2}:\d{2}$/.test(entry))
  );
}

function isWeekdayArray(value: unknown): value is (0 | 1 | 2 | 3 | 4 | 5 | 6)[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((entry) => Number.isInteger(entry) && entry >= 0 && entry <= 6)
  );
}
