"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Pet } from "@/core";
import { addMedication } from "@/data/actions";
import MedicationForm, { type MedicationSubmission } from "@/components/MedicationForm";

interface Props {
  householdId: string;
  pets: Pet[];
  takenColorIds: string[];
  suggestedColorId: string;
}

export default function AddMedicationForm({
  householdId,
  pets,
  takenColorIds,
  suggestedColorId,
}: Props) {
  const router = useRouter();
  const [petId, setPetId] = useState(pets[0]?.id ?? "");

  async function handleSubmit(submission: MedicationSubmission) {
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

  return (
    <div className="space-y-5">
      {pets.length > 1 && (
        <div>
          <span className="field-label">Which pet</span>
          <div className="flex flex-wrap gap-2">
            {pets.map((pet) => (
              <button
                key={pet.id}
                type="button"
                aria-pressed={petId === pet.id}
                onClick={() => setPetId(pet.id)}
                className={`rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                  petId === pet.id
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                    : "border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink-soft)]"
                }`}
              >
                {pet.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <MedicationForm
        suggestedColorId={suggestedColorId}
        takenColorIds={takenColorIds}
        submitLabel="Save medication"
        onSubmit={handleSubmit}
      />
    </div>
  );
}
