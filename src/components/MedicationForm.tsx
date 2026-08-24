"use client";

import { useState, type FormEvent } from "react";
import {
  describeFrequency,
  formatTimeOfDay,
  validateFrequency,
  type Frequency,
} from "@/core";
import ColorPicker from "./ColorPicker";
import FrequencyPicker, {
  draftToFrequency,
  frequencyToDraft,
  initialDraft,
  type FrequencyDraft,
} from "./FrequencyPicker";
import PhotoCapture, { type ExtractedLabel } from "./PhotoCapture";

export interface MedicationSubmission {
  name: string;
  directions: string | null;
  frequency: Frequency;
  startAt: string;
  endAt: string | null;
  colorId: string;
}

interface Props {
  suggestedColorId: string;
  takenColorIds: readonly string[];
  submitLabel: string;
  onSubmit: (submission: MedicationSubmission) => Promise<{ ok: boolean; error?: string }>;
  onPetNameDetected?: (petName: string) => void;
}

export default function MedicationForm({
  suggestedColorId,
  takenColorIds,
  submitLabel,
  onSubmit,
  onPetNameDetected,
}: Props) {
  const today = localDateInput(new Date());
  const nowTime = localTimeInput(new Date());

  const [name, setName] = useState("");
  const [directions, setDirections] = useState("");
  const [draft, setDraft] = useState<FrequencyDraft>(() => initialDraft(nowTime));
  const [startDate, setStartDate] = useState(today);
  const [startTime, setStartTime] = useState(nowTime);
  const [hasEnd, setHasEnd] = useState(false);
  const [endDate, setEndDate] = useState("");
  const [colorId, setColorId] = useState(suggestedColorId);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const frequency = draftToFrequency(draft);

  function applyExtraction(label: ExtractedLabel) {
    if (label.name) setName(label.name);
    if (label.directions) setDirections(label.directions);
    if (label.frequency) setDraft(frequencyToDraft(label.frequency, startTime));
    if (label.petName && onPetNameDetected) onPetNameDetected(label.petName);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Give the medication a name.");
      return;
    }

    const frequencyError = validateFrequency(frequency);
    if (frequencyError) {
      setError(frequencyError);
      return;
    }

    const startAt = new Date(`${startDate}T${startTime}`);
    if (Number.isNaN(startAt.getTime())) {
      setError("Pick a valid start date and time.");
      return;
    }

    let endAt: Date | null = null;
    if (hasEnd && endDate) {
      // End of the chosen day, so a "through Friday" course includes Friday.
      endAt = new Date(`${endDate}T23:59`);
      if (Number.isNaN(endAt.getTime()) || endAt <= startAt) {
        setError("The end date must be after the start date.");
        return;
      }
    }

    setBusy(true);
    try {
      const result = await onSubmit({
        name: name.trim(),
        directions: directions.trim() || null,
        frequency,
        startAt: startAt.toISOString(),
        endAt: endAt?.toISOString() ?? null,
        colorId,
      });
      if (!result.ok) setError(result.error ?? "Could not save the medication.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the medication.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PhotoCapture anchorTime={startTime} onExtracted={applyExtraction} />

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-[var(--color-line)]" />
        <span className="text-xs uppercase tracking-wide text-[var(--color-ink-faint)]">
          or type it in
        </span>
        <span className="h-px flex-1 bg-[var(--color-line)]" />
      </div>

      <div>
        <label className="field-label" htmlFor="medName">
          Medication name
        </label>
        <input
          id="medName"
          className="field"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Rimadyl 75mg"
        />
      </div>

      <div>
        <label className="field-label" htmlFor="directions">
          Directions
        </label>
        <textarea
          id="directions"
          className="field min-h-20 resize-y"
          value={directions}
          onChange={(event) => setDirections(event.target.value)}
          placeholder="1 tablet by mouth with food"
        />
      </div>

      <FrequencyPicker draft={draft} onChange={setDraft} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label" htmlFor="startDate">
            Starts
          </label>
          <input
            id="startDate"
            type="date"
            className="field"
            required
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="startTime">
            First dose at
          </label>
          <input
            id="startTime"
            type="time"
            className="field"
            required
            value={startTime}
            onChange={(event) => {
              setStartTime(event.target.value);
              // Keep the schedule's times in step with the first dose until
              // they have been edited away from the default.
              if (draft.times.length === 1 && draft.mode === "daily") {
                setDraft({ ...draft, times: [event.target.value] });
              }
            }}
          />
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2.5 text-sm text-[var(--color-ink-soft)]">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--color-accent)]"
            checked={hasEnd}
            onChange={(event) => setHasEnd(event.target.checked)}
          />
          This is a course with an end date
        </label>
        {hasEnd && (
          <input
            type="date"
            className="field mt-2.5"
            value={endDate}
            min={startDate}
            aria-label="Last day of the course"
            onChange={(event) => setEndDate(event.target.value)}
          />
        )}
      </div>

      <ColorPicker value={colorId} takenColorIds={takenColorIds} onChange={setColorId} />

      <div className="rounded-xl bg-[var(--color-canvas)] px-3.5 py-3 text-sm text-[var(--color-ink-soft)]">
        <span className="font-medium text-[var(--color-ink)]">Schedule: </span>
        {describeFrequency(frequency)}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-[var(--color-danger-soft)] px-3.5 py-3 text-sm text-[var(--color-danger)]"
        >
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

/** `YYYY-MM-DD` in the device's timezone, as `<input type="date">` expects. */
function localDateInput(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

/** `HH:MM` in the device's timezone, rounded to the next 15 minutes. */
function localTimeInput(date: Date): string {
  const rounded = new Date(date);
  rounded.setMinutes(Math.ceil(rounded.getMinutes() / 15) * 15, 0, 0);
  return formatTimeOfDay(rounded.getHours(), rounded.getMinutes());
}
