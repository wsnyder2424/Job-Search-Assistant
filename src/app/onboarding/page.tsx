import { redirect } from "next/navigation";
import { assignColor } from "@/core";
import { readSupabaseEnv } from "@/lib/supabase/env";
import { getCurrentUser } from "@/lib/supabase/server";
import { getCurrentHousehold, getTakenColorIds } from "@/data/queries";
import SetupNotice from "@/components/SetupNotice";
import OnboardingFlow from "./OnboardingFlow";

/** Reads the session cookie, so it must render per request rather than
 *  being prerendered at build time. */
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  if (!readSupabaseEnv()) return <SetupNotice />;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Someone arriving here with a household already set up is adding another
  // medication, not starting over.
  const household = await getCurrentHousehold();
  const takenColorIds = household ? await getTakenColorIds(household.id) : [];

  return (
    <OnboardingFlow
      existingHousehold={household}
      takenColorIds={takenColorIds}
      suggestedColorId={assignColor(takenColorIds)}
    />
  );
}
