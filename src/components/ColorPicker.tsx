"use client";

import { MEDICATION_COLORS } from "@/core";

interface Props {
  value: string;
  takenColorIds?: readonly string[];
  onChange: (colorId: string) => void;
}

/**
 * Colors are the primary way a medication is recognized on the schedule, so
 * the picker shows which ones are already spoken for rather than silently
 * allowing two identical-looking meds.
 */
export default function ColorPicker({ value, takenColorIds = [], onChange }: Props) {
  const taken = new Set(takenColorIds);

  return (
    <div>
      <span className="field-label">Color</span>
      <div
        role="radiogroup"
        aria-label="Medication color"
        className="grid grid-cols-6 gap-2.5"
      >
        {MEDICATION_COLORS.map((color) => {
          const selected = color.id === value;
          const inUse = taken.has(color.id) && !selected;
          return (
            <button
              key={color.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={inUse ? `${color.name} (already used)` : color.name}
              title={inUse ? `${color.name} — already used` : color.name}
              onClick={() => onChange(color.id)}
              className={`relative aspect-square rounded-full transition ${
                selected
                  ? "ring-2 ring-[var(--color-text-primary)] ring-offset-2"
                  : "ring-1 ring-black/5"
              } ${inUse ? "opacity-35" : ""}`}
              style={{ backgroundColor: color.hex }}
            >
              {selected && (
                <span
                  aria-hidden
                  className="absolute inset-0 flex items-center justify-center text-sm font-bold"
                  style={{ color: color.onHex }}
                >
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs text-[var(--color-fg-quaternary)]">
        Faded colors are already used by another medication.
      </p>
    </div>
  );
}
