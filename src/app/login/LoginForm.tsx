"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export default function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);

    try {
      const supabase = getBrowserSupabase();

      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName.trim() || email.split("@")[0] },
          },
        });
        if (signUpError) throw signUpError;

        // With email confirmation switched on there is no session yet.
        if (!data.session) {
          setNotice("Check your email to confirm your account, then sign in.");
          setMode("signin");
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }

      router.push("/");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Something went wrong. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === "signup" && (
        <div>
          <label className="field-label" htmlFor="displayName">
            Your name
          </label>
          <input
            id="displayName"
            className="field"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Sam"
            autoComplete="name"
          />
          <p className="mt-1.5 text-xs text-[var(--color-ink-faint)]">
            Shown on the schedule next to doses you give.
          </p>
        </div>
      )}

      <div>
        <label className="field-label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          className="field"
          type="email"
          inputMode="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />
      </div>

      <div>
        <label className="field-label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          className="field"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 8 characters"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-[var(--color-danger-soft)] px-3.5 py-3 text-sm text-[var(--color-danger)]"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-xl bg-[var(--color-accent-soft)] px-3.5 py-3 text-sm text-[var(--color-accent)]"
        >
          {notice}
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
      </button>

      <button
        type="button"
        className="w-full py-2 text-sm text-[var(--color-ink-soft)] underline underline-offset-4"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
          setNotice(null);
        }}
      >
        {mode === "signin"
          ? "New here? Create an account"
          : "Already have an account? Sign in"}
      </button>
    </form>
  );
}
