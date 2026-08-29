import { redirect } from "next/navigation";
import { readSupabaseEnv } from "@/lib/supabase/env";
import { getCurrentUser } from "@/lib/supabase/server";
import { getCurrentHousehold } from "@/data/queries";
import SetupNotice from "@/components/SetupNotice";

/**
 * Entry point: send people to the right place rather than showing a splash
 * screen they have to tap through.
 */
/** Reads the session cookie, so it must render per request rather than
 *  being prerendered at build time. */
export const dynamic = "force-dynamic";

export default async function RootPage() {
  if (!readSupabaseEnv()) return <SetupNotice />;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const household = await getCurrentHousehold();
  redirect(household ? "/home" : "/onboarding");
}
