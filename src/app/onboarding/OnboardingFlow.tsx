"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  acceptInvite,
  addMedication,
  addPet,
  createHouseholdWithPet,
} from "@/data/actions";
import MedicationForm, { type MedicationSubmission } from "@/components/MedicationForm";

interface Props {
  existingHousehold: { id: string; name: string } | null;
  takenColorIds: string[];
  suggestedColorId: string;
}

type Step = "choose" | "pet" | "medication" | "join";

const SPECIES = ["Dog", "Cat", "Bird", "Rabbit", "Other"];

export default function OnboardingFlow({
  existingHousehold,
  takenColorIds,
  suggestedColorId,
}: Props) {
  const router = useRouter();

  const [step, setStep] = useState<Step>(existingHousehold ? "pet" : "choose");
  const [petName, setPetName] = useState("");
  const [species, setSpecies] = useState(SPECIES[0]);
  const [householdId, setHouseholdId] = useState(existingHousehold?.id ?? "");
  const [petId, setPetId] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handlePetSubmit() {
    setError(null);
    if (!petName.trim()) {
      setError("Give your pet a name.");
      return;
    }

    setBusy(true);
    try {
      const result = existingHousehold
        ? await addPet({
            householdId: existingHousehold.id,
            name: petName,
            species,
          })
        : await createHouseholdWithPet({
            householdName: `${petName.trim()}'s household`,
            petName,
            species,
          });

      if (!result.ok || !result.petId) {
        setError(result.error ?? "Could not save that. Try again.");
        return;
      }

      setPetId(result.petId);
      if (!householdId && existingHousehold) setHouseholdId(existingHousehold.id);
      setStep("medication");
    } finally {
      setBusy(false);
    }
  }

  async function handleMedicationSubmit(submission: MedicationSubmission) {
    const result = await addMedication({
      householdId,
      petId,
      name: submission.name,
      directions: submission.directions,
      frequency: submission.frequency,
      startAt: submission.startAt,
      endAt: submission.endAt,
      colorId: submission.colorId,
    });

    if (result.ok) {
      router.push("/home");
      router.refresh();
    }
    return result;
  }

  async function handleJoin() {
    setError(null);
    setBusy(true);
    try {
      const result = await acceptInvite(inviteCode);
      if (!result.ok) {
        setError(result.error ?? "That code did not work.");
        return;
      }
      router.push("/home");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col px-6 py-10">
      {step === "choose" && (
        <div className="flex flex-1 flex-col justify-center gap-6">
          <header>
            <h1 className="text-3xl font-bold tracking-tight">Let&apos;s get set up</h1>
            <p className="mt-2 text-[var(--color-ink-soft)]">
              Start a household for your pet, or join one someone already made.
            </p>
          </header>

          <div className="space-y-3">
            <button className="btn-primary" onClick={() => setStep("pet")}>
              Add my pet
            </button>
            <button className="btn-secondary" onClick={() => setStep("join")}>
              I have an invite code
            </button>
          </div>
        </div>
      )}

      {step === "join" && (
        <div className="flex flex-1 flex-col justify-center gap-5">
          <header>
            <h1 className="text-2xl font-bold tracking-tight">Join a household</h1>
            <p className="mt-2 text-[var(--color-ink-soft)]">
              Enter the code from whoever set up the pet.
            </p>
          </header>

          <div>
            <label className="field-label" htmlFor="inviteCode">
              Invite code
            </label>
            <input
              id="inviteCode"
              className="field text-center font-mono text-xl tracking-[0.3em] uppercase"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
              placeholder="ABCD2345"
              autoCapitalize="characters"
              autoComplete="off"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-[var(--color-danger-soft)] px-3.5 py-3 text-sm text-[var(--color-danger)]">
              {error}
            </p>
          )}

          <div className="space-y-3">
            <button className="btn-primary" disabled={busy} onClick={handleJoin}>
              {busy ? "Joining…" : "Join household"}
            </button>
            <button className="btn-secondary" onClick={() => setStep("choose")}>
              Back
            </button>
          </div>
        </div>
      )}

      {step === "pet" && (
        <div className="flex flex-1 flex-col justify-center gap-5">
          <header>
            <h1 className="text-2xl font-bold tracking-tight">
              {existingHousehold ? "Add a pet" : "Who are we caring for?"}
            </h1>
            <p className="mt-2 text-[var(--color-ink-soft)]">
              You can add more pets later.
            </p>
          </header>

          <div>
            <label className="field-label" htmlFor="petName">
              Pet&apos;s name
            </label>
            <input
              id="petName"
              className="field"
              value={petName}
              onChange={(event) => setPetName(event.target.value)}
              placeholder="Biscuit"
              autoFocus
            />
          </div>

          <div>
            <span className="field-label">Species</span>
            <div className="flex flex-wrap gap-2">
              {SPECIES.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={species === option}
                  onClick={() => setSpecies(option)}
                  className={`rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                    species === option
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                      : "border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink-soft)]"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-[var(--color-danger-soft)] px-3.5 py-3 text-sm text-[var(--color-danger)]">
              {error}
            </p>
          )}

          <button className="btn-primary" disabled={busy} onClick={handlePetSubmit}>
            {busy ? "Saving…" : "Next: add a medication"}
          </button>
        </div>
      )}

      {step === "medication" && (
        <div className="space-y-6">
          <header>
            <h1 className="text-2xl font-bold tracking-tight">
              {petName ? `${petName}'s first medication` : "Add a medication"}
            </h1>
            <p className="mt-2 text-[var(--color-ink-soft)]">
              Snap the label and we&apos;ll fill this in, or type it yourself.
            </p>
          </header>

          <MedicationForm
            suggestedColorId={suggestedColorId}
            takenColorIds={takenColorIds}
            submitLabel="Save and see the schedule"
            onSubmit={handleMedicationSubmit}
          />
        </div>
      )}
    </main>
  );
}
