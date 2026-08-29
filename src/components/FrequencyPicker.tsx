"use client";

import {
  WEEKDAY_NAMES,
  formatTimeOfDayLabel,
  spreadAcrossDay,
  type Frequency,
  type Weekday,
} from "@/core";

export type FrequencyMode =
  | "daily"
  | "interval"
  | "every_n_days"
  | "weekly"
  | "as_needed";

/**
 * The picker keeps its own flattened state rather than editing a `Frequency`
 * directly, so switching between modes does not throw away what you typed in
 * the previous one.
 */
export interface FrequencyDraft {
  mode: FrequencyMode;
  dosesPerDay: number;
  times: string[];
  intervalHours: number;
  dayInterval: number;
  daysOfWeek: Weekday[];
}

export function initialDraft(firstTime = "08:00"): FrequencyDraft {
  return {
    mode: "daily",
    dosesPerDay: 1,
    times: [firstTime],
    intervalHours: 12,
    dayInterval: 30,
    daysOfWeek: [1],
  };
}

/** Build the domain `Frequency` the rest of the app uses. */
export function draftToFrequency(draft: FrequencyDraft): Frequency {
  switch (draft.mode) {
    case "daily":
      return { kind: "daily_at", times: draft.times };
    case "interval":
      return { kind: "interval_hours", hours: draft.intervalHours };
    case "every_n_days":
      return { kind: "every_n_days", days: draft.dayInterval, times: draft.times };
    case "weekly":
      return { kind: "weekly_on", daysOfWeek: draft.daysOfWeek, times: draft.times };
    case "as_needed":
      return { kind: "as_needed" };
  }
}

/** Seed the picker from a frequency read off a label. */
export function frequencyToDraft(
  frequency: Frequency,
  fallbackTime = "08:00",
): FrequencyDraft {
  const base = initialDraft(fallbackTime);
  switch (frequency.kind) {
    case "interval_hours":
      return { ...base, mode: "interval", intervalHours: frequency.hours };
    case "daily_at":
      return {
        ...base,
        mode: "daily",
        dosesPerDay: frequency.times.length,
        times: frequency.times,
      };
    case "every_n_days":
      return {
        ...base,
        mode: "every_n_days",
        dayInterval: frequency.days,
        times: frequency.times,
        dosesPerDay: frequency.times.length,
      };
    case "weekly_on":
      return {
        ...base,
        mode: "weekly",
        daysOfWeek: frequency.daysOfWeek,
        times: frequency.times,
        dosesPerDay: frequency.times.length,
      };
    case "as_needed":
      return { ...base, mode: "as_needed" };
  }
}

const MODE_LABELS: { mode: FrequencyMode; label: string }[] = [
  { mode: "daily", label: "Daily" },
  { mode: "interval", label: "Every N hours" },
  { mode: "every_n_days", label: "Every N days" },
  { mode: "weekly", label: "Certain days" },
  { mode: "as_needed", label: "As needed" },
];

interface Props {
  draft: FrequencyDraft;
  onChange: (draft: FrequencyDraft) => void;
}

export default function FrequencyPicker({ draft, onChange }: Props) {
  const showTimes = draft.mode !== "interval" && draft.mode !== "as_needed";

  function setDosesPerDay(count: number) {
    onChange({
      ...draft,
      dosesPerDay: count,
      times: spreadAcrossDay(draft.times[0] ?? "08:00", count),
    });
  }

  function setTimeAt(index: number, value: string) {
    const times = [...draft.times];
    times[index] = value;
    onChange({ ...draft, times });
  }

  return (
    <div className="space-y-3">
      <span className="field-label">How often</span>

      <div className="flex flex-wrap gap-2">
        {MODE_LABELS.map(({ mode, label }) => (
          <button
            key={mode}
            type="button"
            aria-pressed={draft.mode === mode}
            onClick={() => onChange({ ...draft, mode })}
            className={`rounded-full border px-3.5 py-2 text-sm font-medium transition ${
              draft.mode === mode
                ? "border-[var(--color-border-brand)] bg-[var(--color-bg-brand-solid)] text-white"
                : "border-[var(--color-border-secondary)] bg-[var(--color-bg-primary)] text-[var(--color-text-tertiary)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {draft.mode === "daily" && (
        <div>
          <label className="field-label" htmlFor="dosesPerDay">
            Times per day
          </label>
          <select
            id="dosesPerDay"
            className="field"
            value={draft.dosesPerDay}
            onChange={(event) => setDosesPerDay(Number(event.target.value))}
          >
            {[1, 2, 3, 4, 6].map((count) => (
              <option key={count} value={count}>
                {count}× a day
              </option>
            ))}
          </select>
        </div>
      )}

      {draft.mode === "interval" && (
        <div>
          <label className="field-label" htmlFor="intervalHours">
            Hours between doses
          </label>
          <select
            id="intervalHours"
            className="field"
            value={draft.intervalHours}
            onChange={(event) =>
              onChange({ ...draft, intervalHours: Number(event.target.value) })
            }
          >
            {[4, 6, 8, 12, 24, 48].map((hours) => (
              <option key={hours} value={hours}>
                Every {hours} hours
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-[var(--color-fg-quaternary)]">
            Counted from the start time, so doses land at the same clock times
            each cycle.
          </p>
        </div>
      )}

      {draft.mode === "every_n_days" && (
        <div>
          <label className="field-label" htmlFor="dayInterval">
            Days between doses
          </label>
          <select
            id="dayInterval"
            className="field"
            value={draft.dayInterval}
            onChange={(event) =>
              onChange({ ...draft, dayInterval: Number(event.target.value) })
            }
          >
            {[2, 3, 7, 14, 30].map((days) => (
              <option key={days} value={days}>
                {days === 2 ? "Every other day" : `Every ${days} days`}
                {days === 30 ? " (monthly)" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {draft.mode === "weekly" && (
        <div>
          <span className="field-label">On these days</span>
          <div className="flex gap-1.5">
            {WEEKDAY_NAMES.map((name, index) => {
              const day = index as Weekday;
              const selected = draft.daysOfWeek.includes(day);
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={selected}
                  aria-label={name}
                  onClick={() =>
                    onChange({
                      ...draft,
                      daysOfWeek: selected
                        ? draft.daysOfWeek.filter((d) => d !== day)
                        : [...draft.daysOfWeek, day],
                    })
                  }
                  className={`h-10 flex-1 rounded-lg border text-xs font-semibold transition ${
                    selected
                      ? "border-[var(--color-border-brand)] bg-[var(--color-bg-brand-solid)] text-white"
                      : "border-[var(--color-border-secondary)] bg-[var(--color-bg-primary)] text-[var(--color-text-tertiary)]"
                  }`}
                >
                  {name.slice(0, 1)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showTimes && (
        <div>
          <span className="field-label">
            {draft.times.length > 1 ? "At these times" : "At this time"}
          </span>
          <div className="space-y-2">
            {draft.times.map((time, index) => (
              <div key={index} className="flex items-center gap-2.5">
                <input
                  type="time"
                  className="field"
                  value={time}
                  aria-label={`Dose ${index + 1} time`}
                  onChange={(event) => setTimeAt(index, event.target.value)}
                />
                <span className="w-20 shrink-0 text-sm text-[var(--color-fg-quaternary)]">
                  {safeLabel(time)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {draft.mode === "as_needed" && (
        <p className="rounded-xl bg-[var(--color-bg-secondary)] px-3.5 py-3 text-sm text-[var(--color-text-tertiary)]">
          As-needed medications stay off the schedule. You can still log each
          time you give one.
        </p>
      )}
    </div>
  );
}

function safeLabel(time: string): string {
  try {
    return formatTimeOfDayLabel(time);
  } catch {
    return "";
  }
}
