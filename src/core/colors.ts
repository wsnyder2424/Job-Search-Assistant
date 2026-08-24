/**
 * The medication palette. Each medication gets one of these so the schedule
 * can be read at a glance, and so a caregiver can match "the blue one" to a
 * pill without reading the label.
 *
 * Colors are chosen to stay distinguishable from one another and to carry
 * enough contrast against both the light and dark surfaces used in the UI.
 * They are stored by `id`, never by hex, so the palette can be re-tuned later
 * without migrating rows.
 */

export interface MedicationColor {
  id: string;
  name: string;
  /** Solid fill — dots, checkboxes, the row's accent bar. */
  hex: string;
  /** Tinted background for the row itself. */
  softHex: string;
  /** Text/icon color that meets contrast on `hex`. */
  onHex: string;
}

export const MEDICATION_COLORS: MedicationColor[] = [
  { id: "coral", name: "Coral", hex: "#E5484D", softHex: "#FEEBEC", onHex: "#FFFFFF" },
  { id: "amber", name: "Amber", hex: "#B8730B", softHex: "#FEF3DA", onHex: "#FFFFFF" },
  { id: "teal", name: "Teal", hex: "#0D7C77", softHex: "#DDF5F3", onHex: "#FFFFFF" },
  { id: "indigo", name: "Indigo", hex: "#3E56C4", softHex: "#E6E9FB", onHex: "#FFFFFF" },
  { id: "violet", name: "Violet", hex: "#8347B9", softHex: "#F3E9FB", onHex: "#FFFFFF" },
  { id: "moss", name: "Moss", hex: "#3E7B36", softHex: "#E5F3E2", onHex: "#FFFFFF" },
  { id: "rose", name: "Rose", hex: "#C2298A", softHex: "#FCE7F4", onHex: "#FFFFFF" },
  { id: "sky", name: "Sky", hex: "#0B6FAF", softHex: "#E0F0FA", onHex: "#FFFFFF" },
  { id: "rust", name: "Rust", hex: "#AD5217", softHex: "#FBEBE0", onHex: "#FFFFFF" },
  { id: "plum", name: "Plum", hex: "#6E3A6B", softHex: "#F4E8F3", onHex: "#FFFFFF" },
  { id: "olive", name: "Olive", hex: "#6B6B18", softHex: "#F3F3DC", onHex: "#FFFFFF" },
  { id: "slate", name: "Slate", hex: "#4A5568", softHex: "#EDEFF3", onHex: "#FFFFFF" },
];

const DEFAULT_COLOR = MEDICATION_COLORS[0];

export function getColor(colorId: string | null | undefined): MedicationColor {
  return MEDICATION_COLORS.find((c) => c.id === colorId) ?? DEFAULT_COLOR;
}

/**
 * Pick a color for a new medication: the first one nobody in the household is
 * already using, so two meds never look alike until the palette runs out.
 * Past that, distribute deterministically by name so the same medication keeps
 * the same color across devices.
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
