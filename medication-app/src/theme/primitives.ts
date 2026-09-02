/**
 * Raw color ramps. Nothing in the app should import from this file directly —
 * use `tokens.ts`, which gives every value a name that says what it is for.
 * Mirrors the `Primitives` variable collection in Figma (Pet-medication-app).
 */

export const neutral = {
  white: '#ffffff',
  50: '#fafafa',
  100: '#f5f5f5',
  200: '#e5e5e5',
  300: '#d4d4d4',
  500: '#737373',
  600: '#525252',
  700: '#404040',
  900: '#171717',
} as const;

/** Brand ramp. Replaces the kit's placeholder purple — design.md §5. */
export const green = {
  50: '#f0fdf4',
  100: '#dcfce7',
  200: '#bbf7d0', // mint — the brand
  300: '#86efac',
  400: '#4ade80',
  500: '#22c55e',
  600: '#16a34a',
  700: '#15803d',
  800: '#166534',
  900: '#14532d',
} as const;

/** Warning ramp, taken from the Polestar reference — design.md §5. */
export const orange = {
  100: '#ffedd5',
  500: '#f97316',
  700: '#c2410c',
} as const;

export const status = {
  error: '#dc2626',
  errorBg: '#fef2f2',
  success: '#16a34a',
  successBg: '#f0fdf4',
} as const;

/** Borders are soft gray with opacity, not a solid line — design.md §5, §12. */
export const alpha = {
  black10: 'rgba(0, 0, 0, 0.1)',
} as const;

/**
 * Rx hues. Max 16, never reused within one course, never used to mean status.
 * `surface` is the row tint, `mark` the small solid chip, `text` the name.
 * Green is absent on purpose — the brand is a green tint.
 */
export const rxHues = {
  blue:    { surface: '#dbeafe', mark: '#3b82f6', text: '#1d4ed8' },
  rose:    { surface: '#ffe4e6', mark: '#f43f5e', text: '#be123c' },
  amber:   { surface: '#fef3c7', mark: '#f59e0b', text: '#b45309' },
  violet:  { surface: '#ede9fe', mark: '#8b5cf6', text: '#6d28d9' },
  teal:    { surface: '#ccfbf1', mark: '#14b8a6', text: '#0f766e' },
  orange:  { surface: '#ffedd5', mark: '#f97316', text: '#c2410c' },
  fuchsia: { surface: '#fae8ff', mark: '#d946ef', text: '#a21caf' },
  sky:     { surface: '#e0f2fe', mark: '#0ea5e9', text: '#0369a1' },
  emerald: { surface: '#d1fae5', mark: '#10b981', text: '#047857' },
  red:     { surface: '#fee2e2', mark: '#ef4444', text: '#b91c1c' },
  indigo:  { surface: '#e0e7ff', mark: '#6366f1', text: '#4338ca' },
  yellow:  { surface: '#fef9c3', mark: '#eab308', text: '#a16207' },
  pink:    { surface: '#fce7f3', mark: '#ec4899', text: '#be185d' },
  cyan:    { surface: '#cffafe', mark: '#06b6d4', text: '#0e7490' },
  purple:  { surface: '#f3e8ff', mark: '#a855f7', text: '#7e22ce' },
  lime:    { surface: '#ecfccb', mark: '#84cc16', text: '#4d7c0f' },
} as const;

export type RxHue = keyof typeof rxHues;

/**
 * The order the app assigns hues in, so the first few Rx in a course are
 * maximally distinct from each other and from the mint brand.
 *
 * UNRESOLVED — design.md open conflict 10. Warning is now orange, and `orange`
 * sits at position 6 with `amber` at position 3, close enough to read as
 * status. Expect this list to change; it is the only place that needs editing.
 */
export const rxAssignmentOrder: readonly RxHue[] = [
  'blue', 'rose', 'amber', 'violet', 'teal', 'orange', 'fuchsia', 'sky',
  'emerald', 'red', 'indigo', 'yellow', 'pink', 'cyan', 'purple', 'lime',
] as const;
