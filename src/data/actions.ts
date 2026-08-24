"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  assignColor,
  validateFrequency,
  type Frequency,
} from "@/core";
import { getServerSupabase } from "@/lib/supabase/server";
import { getTakenColorIds } from "./queries";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const OK: ActionResult = { ok: true };

function fail(error: string): ActionResult {
  return { ok: false, error };
}

async function requireUser() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/** Create the household and its first pet — the first onboarding step. */
export async function createHouseholdWithPet(input: {
  householdName: string;
  petName: string;
  species: string | null;
}): Promise<ActionResult & { petId?: string }> {
  const { supabase, user } = await requireUser();

  const householdName = input.householdName.trim();
  const petName = input.petName.trim();
  if (!petName) return fail("Give your pet a name.");

  const { data: household, error: householdError } = await supabase
    .from("households")
    .insert({
      name: householdName || `${petName}'s household`,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (householdError || !household) {
    return fail(householdError?.message ?? "Could not create the household.");
  }

  const { data: pet, error: petError } = await supabase
    .from("pets")
    .insert({
      household_id: (household as { id: string }).id,
      name: petName,
      species: input.species?.trim() || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (petError || !pet) {
    return fail(petError?.message ?? "Could not add your pet.");
  }

  revalidatePath("/", "layout");
  return { ...OK, petId: (pet as { id: string }).id };
}

export async function addPet(input: {
  householdId: string;
  name: string;
  species: string | null;
}): Promise<ActionResult & { petId?: string }> {
  const { supabase, user } = await requireUser();
  const name = input.name.trim();
  if (!name) return fail("Give your pet a name.");

  const { data, error } = await supabase
    .from("pets")
    .insert({
      household_id: input.householdId,
      name,
      species: input.species?.trim() || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) return fail(error?.message ?? "Could not add your pet.");

  revalidatePath("/", "layout");
  return { ...OK, petId: (data as { id: string }).id };
}

export interface AddMedicationInput {
  householdId: string;
  petId: string;
  name: string;
  directions: string | null;
  frequency: Frequency;
  /** ISO instant of the first dose. */
  startAt: string;
  endAt: string | null;
  /** Omit to auto-assign the next unused color in the household. */
  colorId?: string;
}

export async function addMedication(
  input: AddMedicationInput,
): Promise<ActionResult & { medicationId?: string }> {
  const { supabase, user } = await requireUser();

  const name = input.name.trim();
  if (!name) return fail("Give the medication a name.");

  const frequencyError = validateFrequency(input.frequency);
  if (frequencyError) return fail(frequencyError);

  const startAt = new Date(input.startAt);
  if (Number.isNaN(startAt.getTime())) return fail("Pick a valid start date and time.");

  const endAt = input.endAt ? new Date(input.endAt) : null;
  if (endAt && (Number.isNaN(endAt.getTime()) || endAt <= startAt)) {
    return fail("The end date must be after the start date.");
  }

  const colorId =
    input.colorId ?? assignColor(await getTakenColorIds(input.householdId), name);

  const { data, error } = await supabase
    .from("medications")
    .insert({
      pet_id: input.petId,
      name,
      directions: input.directions?.trim() || null,
      frequency: input.frequency,
      start_at: startAt.toISOString(),
      end_at: endAt?.toISOString() ?? null,
      color_id: colorId,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return fail(error?.message ?? "Could not save the medication.");
  }

  revalidatePath("/", "layout");
  return { ...OK, medicationId: (data as { id: string }).id };
}

export async function updateMedicationColor(
  medicationId: string,
  colorId: string,
): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("medications")
    .update({ color_id: colorId })
    .eq("id", medicationId);

  if (error) return fail(error.message);
  revalidatePath("/", "layout");
  return OK;
}

export async function archiveMedication(medicationId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("medications")
    .update({ archived: true })
    .eq("id", medicationId);

  if (error) return fail(error.message);
  revalidatePath("/", "layout");
  return OK;
}

/**
 * Check off a dose. The unique index on (medication_id, scheduled_for) means
 * two caregivers tapping the same slot at once produce one record, not two —
 * the second tap is reported as already given rather than as an error.
 */
export async function markDoseGiven(input: {
  medicationId: string;
  scheduledFor: string;
  notes?: string | null;
}): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const scheduledFor = new Date(input.scheduledFor);
  if (Number.isNaN(scheduledFor.getTime())) return fail("Invalid dose time.");

  const { error } = await supabase.from("doses").insert({
    medication_id: input.medicationId,
    scheduled_for: scheduledFor.toISOString(),
    given_at: new Date().toISOString(),
    given_by: user.id,
    notes: input.notes?.trim() || null,
  });

  // 23505 = unique violation: somebody else logged this slot first, which is
  // the outcome we wanted anyway.
  if (error && error.code !== "23505") return fail(error.message);

  revalidatePath("/", "layout");
  return OK;
}

/** Undo a check-off — for the inevitable mis-tap. */
export async function undoDose(input: {
  medicationId: string;
  scheduledFor: string;
}): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const scheduledFor = new Date(input.scheduledFor);
  if (Number.isNaN(scheduledFor.getTime())) return fail("Invalid dose time.");

  const { error } = await supabase
    .from("doses")
    .delete()
    .eq("medication_id", input.medicationId)
    .eq("scheduled_for", scheduledFor.toISOString());

  if (error) return fail(error.message);
  revalidatePath("/", "layout");
  return OK;
}

export async function createInvite(
  householdId: string,
): Promise<ActionResult & { code?: string }> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("create_household_invite", {
    target_household: householdId,
  });

  if (error) return fail(error.message);
  return { ...OK, code: data as string };
}

export async function acceptInvite(code: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return fail("Enter an invite code.");

  const { error } = await supabase.rpc("accept_household_invite", {
    invite_code: trimmed,
  });

  if (error) return fail(error.message);
  revalidatePath("/", "layout");
  return OK;
}

export async function signOut(): Promise<void> {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}
