import { redirect } from "next/navigation";
import { readSupabaseEnv } from "@/lib/supabase/env";
import { getCurrentUser } from "@/lib/supabase/server";
import {
  getCurrentHousehold,
  getDosesInWindow,
  getHouseholdSnapshot,
} from "@/data/queries";
import SetupNotice from "@/components/SetupNotice";
import ScheduleView from "./ScheduleView";

/** How much of the schedule to load: yesterday, for anything still unchecked,
 *  through the coming week. */
const LOOK_BACK_MS = 24 * 60 * 60 * 1000;
const LOOK_AHEAD_MS = 7 * 24 * 60 * 60 * 1000;

/** Reads the session cookie, so it must render per request rather than
 *  being prerendered at build time. */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!readSupabaseEnv()) return <SetupNotice />;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const household = await getCurrentHousehold();
  if (!household) redirect("/onboarding");

  const snapshot = await getHouseholdSnapshot(household.id, household.name);

  const now = Date.now();
  const from = new Date(now - LOOK_BACK_MS);
  const to = new Date(now + LOOK_AHEAD_MS);
  const doses = await getDosesInWindow(
    snapshot.medications.map((medication) => medication.id),
    from,
    to,
  );

  return (
    <ScheduleView
      householdId={snapshot.householdId}
      householdName={snapshot.householdName}
      pets={snapshot.pets}
      medications={snapshot.medications}
      doses={doses}
      memberCount={snapshot.members.length}
      currentUserId={user.id}
      windowFrom={from.toISOString()}
      windowTo={to.toISOString()}
    />
  );
}
