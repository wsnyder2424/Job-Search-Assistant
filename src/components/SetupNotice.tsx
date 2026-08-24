/**
 * Shown when the app is running without Supabase credentials, so a fresh
 * checkout explains itself instead of throwing a connection error.
 */
export default function SetupNotice() {
  return (
    <main className="flex min-h-dvh flex-col justify-center gap-5 px-6 py-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Almost there</h1>
        <p className="mt-2 text-[var(--color-ink-soft)]">
          This app needs a Supabase project before it can store anything.
        </p>
      </div>

      <ol className="card space-y-3 p-5 text-sm leading-relaxed">
        <li>
          <span className="font-semibold">1.</span> Create a project at{" "}
          <span className="font-mono text-xs">supabase.com</span>.
        </li>
        <li>
          <span className="font-semibold">2.</span> Run{" "}
          <span className="font-mono text-xs">supabase/schema.sql</span> in the
          project&apos;s SQL editor.
        </li>
        <li>
          <span className="font-semibold">3.</span> Copy{" "}
          <span className="font-mono text-xs">.env.example</span> to{" "}
          <span className="font-mono text-xs">.env.local</span> and fill in the
          project URL and anon key.
        </li>
        <li>
          <span className="font-semibold">4.</span> Restart the dev server.
        </li>
      </ol>

      <p className="text-sm text-[var(--color-ink-faint)]">
        Full instructions are in the README.
      </p>
    </main>
  );
}
