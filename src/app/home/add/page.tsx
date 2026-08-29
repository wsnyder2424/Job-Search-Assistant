import { redirect } from "next/navigation";
import Link from "next/link";
import { assignColor } from "@/core";
import { readSupabaseEnv } from "@/lib/supabase/env";
import { getCurrentUser } from "@/lib/supabase/server";
import {
  getCurrentHousehold,
  getHouseholdSnapshot,
  getTakenColorIds,
} from "@/data/queries";
import SetupNotice from "@/components/SetupNotice";
import AddMedicationForm from "./AddMedicationForm";

/** Reads the session cookie, so it must render per request rather than
 *  being prerendered at build time. */
export const dynamic = "force-dynamic";

export default async function AddMedicationPage() {
  if (!readSupabaseEnv()) return <SetupNotice />;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const household = await getCurrentHousehold();
  if (!household) redirect("/onboarding");

  const snapshot = await getHouseholdSnapshot(household.id, household.name);
  if (snapshot.pets.length === 0) redirect("/onboarding");

  const takenColorIds = await getTakenColorIds(household.id);

  return (
    <main className="min-h-dvh px-6 py-8">
      <Link
        href="/home"
        className="text-sm text-[var(--color-text-tertiary)] underline underline-offset-4"
      >
        ← Back to schedule
      </Link>

      <h1 className="mt-4 mb-6 text-2xl font-bold tracking-tight">Add a medication</h1>

      <AddMedicationForm
        householdId={household.id}
        pets={snapshot.pets}
        takenColorIds={takenColorIds}
        suggestedColorId={assignColor(takenColorIds)}
      />
    </main>
  );
}
