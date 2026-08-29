"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import GoogleButton from "@/components/GoogleButton";

type Mode = "signup" | "signin";

interface Props {
  /** Message passed back by /auth/callback when an OAuth attempt failed. */
  initialError?: string;
}

/**
 * First-run auth. Sign-up is the default mode, because the only people who
 * reach this screen without an account are new — anyone returning has a
 * session and never sees it.
 */
export default function LoginForm({ initialError }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  async function handleGoogle() {
    setError(null);
    setNotice(null);
    setGoogleBusy(true);

    try {
      const supabase = getBrowserSupabase();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          // Always let the user pick which Google account, rather than
          // silently reusing whichever one the browser is already signed into.
          queryParams: { prompt: "select_account" },
        },
      });
      // On success the browser navigates to Google, so nothing below runs.
      if (oauthError) throw oauthError;
    } catch (caught) {
      setGoogleBusy(false);
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not open Google sign-in. Try again.",
      );
    }
  }

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
            emailRedirectTo: `${window.location.origin}/auth/callback`,
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

  const disabled = busy || googleBusy;

  return (
    <div className="space-y-5">
      <GoogleButton
        busy={googleBusy}
        onClick={handleGoogle}
        label={mode === "signup" ? "Continue with Google" : "Sign in with Google"}
      />

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-[var(--color-border-secondary)]" />
        <span className="text-xs uppercase tracking-wide text-[var(--color-fg-quaternary)]">
          or
        </span>
        <span className="h-px flex-1 bg-[var(--color-border-secondary)]" />
      </div>

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
            <p className="mt-1.5 text-xs text-[var(--color-fg-quaternary)]">
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
            className="rounded-[var(--radius-md)] bg-[var(--color-bg-error-primary)] px-3.5 py-3 text-sm text-[var(--color-text-error-primary)]"
          >
            {error}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="rounded-[var(--radius-md)] bg-[var(--color-bg-brand-primary)] px-3.5 py-3 text-sm text-[var(--color-text-brand-secondary)]"
          >
            {notice}
          </p>
        )}

        <button type="submit" className="btn-primary" disabled={disabled}>
          {busy
            ? "One moment…"
            : mode === "signup"
              ? "Create account"
              : "Sign in"}
        </button>
      </form>

      <button
        type="button"
        className="w-full py-2 text-sm text-[var(--color-text-tertiary)] underline underline-offset-4"
        onClick={() => {
          setMode(mode === "signup" ? "signin" : "signup");
          setError(null);
          setNotice(null);
        }}
      >
        {mode === "signup"
          ? "Already have an account? Sign in"
          : "New here? Create an account"}
      </button>
    </div>
  );
}
