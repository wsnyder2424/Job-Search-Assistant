import { redirect } from "next/navigation";
import { readSupabaseEnv } from "@/lib/supabase/env";
import { getCurrentUser } from "@/lib/supabase/server";
import SetupNotice from "@/components/SetupNotice";
import LoginForm from "./LoginForm";

/** Reads the session cookie, so it must render per request rather than
 *  being prerendered at build time. */
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (!readSupabaseEnv()) return <SetupNotice />;

  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <main className="flex min-h-dvh flex-col justify-center px-6 py-12">
      <header className="mb-8">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-accent)] text-2xl">
          🐾
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Dosely</h1>
        <p className="mt-2 text-[var(--color-ink-soft)]">
          Every dose, every pet — and everyone who looks after them, on the same
          schedule.
        </p>
      </header>

      <LoginForm />
    </main>
  );
}
