"use client";

import { useEffect, useState } from "react";
import { createInvite } from "@/data/actions";

interface Props {
  householdId: string;
  onClose: () => void;
}

/**
 * Generates a one-time code another caregiver redeems to join the household.
 * Codes are minted on the server so nothing here can grant itself access.
 */
export default function InviteSheet({ householdId, onClose }: Props) {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    createInvite(householdId)
      .then((result) => {
        if (!active) return;
        if (result.ok && result.code) setCode(result.code);
        else setError(result.error ?? "Could not create an invite.");
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [householdId]);

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied; the code is on screen to read out.
      setCopied(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-20 flex items-end justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="Invite a caregiver"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-[var(--color-surface)] p-6 pb-8"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-xl font-bold tracking-tight">Invite a caregiver</h2>
        <p className="mt-1.5 text-sm text-[var(--color-ink-soft)]">
          They enter this code when they sign up. It works once and expires in a
          week.
        </p>

        <div className="my-6 text-center">
          {busy && <p className="text-[var(--color-ink-soft)]">Creating a code…</p>}
          {error && (
            <p role="alert" className="text-sm text-[var(--color-danger)]">
              {error}
            </p>
          )}
          {code && (
            <p className="font-mono text-3xl font-bold tracking-[0.25em]">{code}</p>
          )}
        </div>

        <div className="space-y-3">
          {code && (
            <button className="btn-primary" onClick={copy}>
              {copied ? "Copied" : "Copy code"}
            </button>
          )}
          <button className="btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
