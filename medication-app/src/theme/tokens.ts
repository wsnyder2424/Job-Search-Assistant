/**
 * Semantic tokens — the only color/space/type names the app should use.
 * Mirrors the `Tokens` variable collection in Figma (Pet-medication-app).
 * Source of truth for every decision here: design.md §5.
 */

import { alpha, green, neutral, orange, status } from './primitives';

export const color = {
  bg: {
    primary: neutral.white,
    secondary: neutral[50],
    tertiary: neutral[100],
    quaternary: neutral[200],
  },
  text: {
    /** Display type and the next round only. Everything else uses `body`. */
    primary: neutral[900],
    body: neutral[700],
    secondary: neutral[700],
    tertiary: neutral[600],
    placeholder: neutral[500],
  },
  border: {
    /** Soft, with opacity — never the solid #d4d4d4. */
    primary: alpha.black10,
    secondary: neutral[200],
    tertiary: neutral[100],
  },
  brand: {
    /**
     * Mint #bbf7d0. A SURFACE only — never text, never an icon, never a solid
     * button fill with white text. Text sitting on it is `color.text.primary`.
     * Never used to mean "given".
     */
    surface: green[200],
    text: green[700],
    textStrong: green[800],
  },
  status: {
    error: status.error,
    errorBg: status.errorBg,
    success: status.success,
    successBg: status.successBg,
    /**
     * Warning is orange, and behaves like the brand: a surface, not a text
     * color. Warning toasts and chips ONLY — never a normal function, never
     * ordinary messaging. Text on `warningSurface` is `color.text.primary`.
     */
    warningSurface: orange[500],
    warningText: orange[700],
    warningBg: orange[100],
  },
} as const;

/** Base unit 4. design.md §5. */
export const space = {
  xxs: 2, xs: 4, sm: 6, md: 8, lg: 12, xl: 16,
  '2xl': 20, '3xl': 24, '4xl': 32, '5xl': 40, '6xl': 48, '7xl': 64, '8xl': 80,
} as const;

export const containerPaddingMobile = 16;

/**
 * Buttons and round surfaces are 12. Anything else needing a corner is also 12
 * unless design.md says otherwise — do not introduce 8 or 16. Never 0–4.
 */
export const radius = {
  none: 0, xxs: 2, xs: 4, sm: 6, md: 8, lg: 10, xl: 12,
  '2xl': 16, '3xl': 20, '4xl': 24, full: 9999,
} as const;

export const button = radius.xl;
export const roundSurface = radius.xl;

export const fontFamily = {
  /** Screen titles and the one big thing. */
  display: 'LeagueSpartan',
  body: 'Inter',
} as const;

export const fontWeight = {
  regular: '400', medium: '500', semibold: '600', bold: '700',
} as const;

/** Inter body scale. design.md §5. */
export const text = {
  xs: { fontSize: 12, lineHeight: 18 },
  sm: { fontSize: 14, lineHeight: 20 },
  md: { fontSize: 16, lineHeight: 24 },
  lg: { fontSize: 18, lineHeight: 28 },
  xl: { fontSize: 20, lineHeight: 30 },
} as const;

/**
 * The four decided type roles. Note that the next-round time and the Rx name
 * are deliberately the SAME style — neither outranks the other, color does the
 * differentiating.
 */
export const type = {
  display: {
    fontFamily: fontFamily.display,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: fontWeight.semibold,
  },
  body: {
    fontFamily: fontFamily.body,
    ...text.md,
    fontWeight: fontWeight.regular,
  },
  roundTime: {
    fontFamily: fontFamily.body,
    ...text.md,
    fontWeight: fontWeight.semibold,
  },
  rxName: {
    fontFamily: fontFamily.body,
    ...text.md,
    fontWeight: fontWeight.semibold,
  },
  instructions: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: fontWeight.regular,
  },
} as const;

export const shadow = {
  xs: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
} as const;
