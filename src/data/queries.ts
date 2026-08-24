import "server-only";

import type { Dose, HouseholdMember, Medication, Pet } from "@/core";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  displayNameOf,
  toDose,
  toMedication,
  toPet,
  type DoseRow,
  type EmbeddedProfile,
  type MedicationRow,
  type PetRow,
} from "./mappers";

export interface HouseholdSnapshot {
  householdId: string;
  householdName: string;
  pets: Pet[];
  medications: Medication[];
  members: HouseholdMember[];
}

/** The household the signed-in user belongs to, or null if they have none yet. */
export async function getCurrentHousehold(): Promise<{
  id: string;
  name: string;
} | null> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("household_members")
    .select("household_id, households(id, name)")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const household = data.households as unknown as { id: string; name: string } | null;
  return household ? { id: household.id, name: household.name } : null;
}

/** Pets, medications and members for a household, in one round of queries. */
export async function getHouseholdSnapshot(
  householdId: string,
  householdName: string,
): Promise<HouseholdSnapshot> {
  const supabase = await getServerSupabase();

  const [petsResult, membersResult] = await Promise.all([
    supabase
      .from("pets")
      .select("id, household_id, name, species, created_at")
      .eq("household_id", householdId)
      .order("created_at", { ascending: true }),
    supabase
      .from("household_members")
      .select("user_id, household_id, role, profiles(display_name)")
      .eq("household_id", householdId),
  ]);

  const pets = (petsResult.data ?? []).map((row) => toPet(row as PetRow));

  let medications: Medication[] = [];
  if (pets.length > 0) {
    const { data } = await supabase
      .from("medications")
      .select(
        "id, pet_id, name, directions, frequency, start_at, end_at, color_id, archived, created_at",
      )
      .in(
        "pet_id",
        pets.map((pet) => pet.id),
      )
      .eq("archived", false)
      .order("created_at", { ascending: true });
    medications = (data ?? []).map((row) => toMedication(row as MedicationRow));
  }

  const members: HouseholdMember[] = (membersResult.data ?? []).map((row) => {
    const record = row as unknown as {
      user_id: string;
      household_id: string;
      role: "owner" | "caregiver";
      profiles?: EmbeddedProfile;
    };
    return {
      userId: record.user_id,
      householdId: record.household_id,
      displayName: displayNameOf(record.profiles),
      role: record.role,
    };
  });

  return { householdId, householdName, pets, medications, members };
}

/**
 * Doses recorded for the given medications inside a time window. Only *given*
 * doses exist as rows; empty slots are derived from each medication's
 * frequency at render time.
 */
export async function getDosesInWindow(
  medicationIds: string[],
  from: Date,
  to: Date,
): Promise<Dose[]> {
  if (medicationIds.length === 0) return [];
  const supabase = await getServerSupabase();

  const { data, error } = await supabase
    .from("doses")
    .select(
      "id, medication_id, scheduled_for, given_at, given_by, notes, profiles:given_by(display_name)",
    )
    .in("medication_id", medicationIds)
    .gte("scheduled_for", from.toISOString())
    .lt("scheduled_for", to.toISOString());

  if (error) return [];
  return (data ?? []).map((row) => toDose(row as unknown as DoseRow));
}

/** Colors already in use in a household, so a new medication gets a fresh one. */
export async function getTakenColorIds(householdId: string): Promise<string[]> {
  const supabase = await getServerSupabase();
  const { data: pets } = await supabase
    .from("pets")
    .select("id")
    .eq("household_id", householdId);

  const petIds = (pets ?? []).map((pet) => (pet as { id: string }).id);
  if (petIds.length === 0) return [];

  const { data } = await supabase
    .from("medications")
    .select("color_id")
    .in("pet_id", petIds)
    .eq("archived", false);

  return (data ?? []).map((row) => (row as { color_id: string }).color_id);
}
