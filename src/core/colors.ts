/**
 * The medication palette.
 *
 * Each medication gets one of these so the schedule can be read at a glance,
 * and so a caregiver can match "the red one" to a pill without reading the
 * label. Colors are stored by `id`, never by hex, so the palette can be
 * re-themed without migrating any rows.
 *
 * The values themselves are generated from the design system — see
 * `design/tokens.json` and `npm run tokens`. They are drawn from the system's
 * categorical (`utility`) families, and the generator checks on every build
 * that each one stays readable and stays distinguishable from the brand color.
 */

import { MEDICATION_COLORS } from "./palette.generated";

export interface MedicationColor {
  id: string;
  name: string;
  /** Solid fill — the accent bar, the checked checkbox, the hero countdown. */
  hex: string;
  /** Tinted background for the hero card. */
  softHex: string;
  /** Text/icon color that meets contrast on `hex`. */
  onHex: string;
}

export { MEDICATION_COLORS };

const DEFAULT_COLOR = MEDICATION_COLORS[0];

export function getColor(colorId: string | null | undefined): MedicationColor {
  return MEDICATION_COLORS.find((c) => c.id === colorId) ?? DEFAULT_COLOR;
}

/**
 * Pick a color for a new medication: the first one nobody in the household is
 * already using. `MEDICATION_COLORS` is ordered by perceptual distance, so the
 * first medications a household adds get the colors that look least alike.
 * Past the end of the palette, distribute deterministically by name so the
 * same medication keeps the same color across devices.
 */
export function assignColor(
  takenColorIds: readonly string[],
  medicationName = "",
): string {
  const taken = new Set(takenColorIds);
  const free = MEDICATION_COLORS.find((color) => !taken.has(color.id));
  if (free) return free.id;

  let hash = 0;
  for (let i = 0; i < medicationName.length; i += 1) {
    hash = (hash * 31 + medicationName.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % MEDICATION_COLORS.length;
  return MEDICATION_COLORS[index].id;
}
