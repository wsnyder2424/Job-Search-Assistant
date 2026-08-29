#!/usr/bin/env node
/**
 * Generates the app's design tokens from design/tokens.json (exported from
 * Figma Variables).
 *
 * Outputs:
 *   src/app/tokens.generated.css   — Tailwind @theme custom properties
 *   src/core/palette.generated.ts  — the medication palette as plain data
 *
 * Both files are generated; edit design/tokens.json and re-run instead.
 *
 * The medication palette is checked for contrast before it is written: the
 * countdown text on the hero card renders `solid` on `soft`, and the checkbox
 * and "Mark as given" button render `onSolid` on `solid`. If a palette swap
 * would make either unreadable, this script fails rather than shipping it.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tokens = JSON.parse(readFileSync(join(root, "design/tokens.json"), "utf8"));

const BANNER = `/*
 * GENERATED FILE — do not edit.
 * Source: design/tokens.json (exported from Figma Variables)
 * Regenerate: npm run tokens
 */`;

/* ------------------------------------------------------------------ color */

function srgbToLinear(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex);
  return (
    0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
  );
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean.split("").map((c) => c + c).join("")
      : clean.slice(0, 6);
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** WCAG 2.1 contrast ratio, 1–21. */
function contrast(foreground, background) {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const [light, dark] = a > b ? [a, b] : [b, a];
  return (light + 0.05) / (dark + 0.05);
}

/**
 * CIE L*a*b*, used to measure how far apart two medication colors actually
 * look. Hue angle alone is misleading here: a desaturated slate and a
 * saturated sky can sit ~15 degrees apart yet be trivial to tell apart,
 * because one reads as grey.
 */
function toLab(hex) {
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear);
  // Linear sRGB -> XYZ (D65), then XYZ -> Lab.
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** CIE76 colour difference. Roughly: <10 is easy to confuse, >25 is distinct. */
function deltaE(a, b) {
  const [l1, a1, b1] = toLab(a);
  const [l2, a2, b2] = toLab(b);
  return Math.sqrt((l1 - l2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2);
}

/* --------------------------------------------------------------- palette */

/**
 * A medication color needs three usable values: a solid for the accent bar and
 * checkbox, a soft tint for the hero card background, and a text color that
 * reads on the solid. `onSolid` steps to white or to the 700 step depending on
 * which actually passes contrast — the yellow family in particular cannot
 * carry white text.
 */
function buildPalette() {
  const { order, labels } = tokens.medicationPalette;
  const problems = [];

  const palette = order.map((family) => {
    const steps = tokens.utility[family];
    if (!steps) throw new Error(`medicationPalette names "${family}", which is not in utility`);

    const soft = steps["50"];
    let solid = steps["600"];

    // Text on the soft tint must clear 4.5:1 — this is the big countdown.
    if (contrast(solid, soft) < 4.5) {
      const darker = steps["700"];
      if (contrast(darker, soft) >= 4.5) {
        solid = darker;
      } else {
        problems.push(
          `${family}: neither 600 (${contrast(steps["600"], soft).toFixed(2)}:1) nor ` +
            `700 (${contrast(darker, soft).toFixed(2)}:1) reads on the 50 tint`,
        );
      }
    }

    // Label on the solid fill: prefer white, fall back to near-black.
    const onWhite = contrast("#ffffff", solid);
    const onInk = contrast(tokens.color.text.primary, solid);
    const onSolid = onWhite >= 4.5 ? "#ffffff" : onInk >= 4.5 ? tokens.color.text.primary : null;

    if (!onSolid) {
      problems.push(
        `${family}: solid ${solid} carries neither white (${onWhite.toFixed(2)}:1) ` +
          `nor ink (${onInk.toFixed(2)}:1) at 4.5:1`,
      );
    }

    return {
      id: family,
      name: labels[family] ?? family,
      hex: solid,
      softHex: soft,
      onHex: onSolid ?? "#ffffff",
      contrastOnSoft: Number(contrast(solid, soft).toFixed(2)),
      contrastOnSolid: Number(contrast(onSolid ?? "#ffffff", solid).toFixed(2)),
    };
  });

  // A medication colour that looks like the brand colour is a real hazard: the
  // brand is the app's own chrome (primary buttons, focus rings, checked
  // boxes), so a medication wearing it stops reading as a medication.
  const brand = tokens.color.bg["brand-solid"];
  for (const color of palette) {
    const distance = deltaE(color.hex, brand);
    if (distance < 20) {
      problems.push(
        `${color.id} (${color.hex}) is too close to the brand colour ${brand} ` +
          `(dE ${Math.round(distance)}) — it would read as UI chrome, not as a medication`,
      );
    }
  }

  const ids = palette.map((c) => c.id);
  if (new Set(ids).size !== ids.length) problems.push("duplicate family in order");
  const hexes = palette.map((c) => c.hex);
  if (new Set(hexes).size !== hexes.length) problems.push("two medication colors share a hex");

  if (problems.length) {
    console.error("Medication palette failed validation:");
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }

  return palette;
}

/* ------------------------------------------------------------------- CSS */

function cssVars() {
  const lines = [];
  const push = (name, value) => lines.push(`  ${name}: ${value};`);

  lines.push("  /* Semantic colors */");
  for (const [group, entries] of Object.entries(tokens.color)) {
    for (const [key, value] of Object.entries(entries)) {
      push(`--color-${group}-${key}`, value);
    }
  }

  lines.push("", "  /* Type scale — overrides Tailwind's font sizes with the system's */");
  push(
    "--font-sans",
    `"${tokens.font.family.body}", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`,
  );
  for (const [key, size] of Object.entries(tokens.font.size)) {
    // "text-sm" -> --text-sm (so the utility is `text-sm`, not `text-text-sm`).
    const name = key.replace(/^text-/, "");
    push(`--text-${name}`, `${size / 16}rem`);
    const leading = tokens.font.lineHeight[key];
    if (leading) push(`--text-${name}--line-height`, `${leading / 16}rem`);
    const tracking = tokens.font.letterSpacing?.[key];
    if (tracking) push(`--text-${name}--letter-spacing`, `${tracking / 16}rem`);
  }
  for (const [key, weight] of Object.entries(tokens.font.weight)) {
    push(`--font-weight-${key}`, String(weight));
  }

  lines.push("", "  /* Radius — overrides Tailwind's defaults with the system's */");
  for (const [key, value] of Object.entries(tokens.radius)) {
    push(`--radius-${key}`, key === "full" ? "9999px" : `${value / 16}rem`);
  }

  lines.push("", "  /* Shadows */");
  for (const [key, value] of Object.entries(tokens.shadow)) {
    push(`--shadow-${key}`, value);
  }

  return lines.join("\n");
}

/**
 * Spacing is deliberately NOT emitted into Tailwind's `--spacing-*` namespace.
 *
 * In Tailwind v4 the sizing utilities resolve a named key against `--spacing-*`
 * in preference to `--container-*`, so declaring `--spacing-md` silently
 * redefines `max-w-md` from 28rem to 0.5rem and collapses every layout that
 * uses it. The same trap applies to `w-*`, `h-*`, `min-w-*` and friends for
 * every key this system defines (xs, sm, md, lg, xl, 2xl...).
 *
 * These are emitted as plain `--ds-spacing-*` properties instead: the
 * component recipes in globals.css reference them directly, and Tailwind's own
 * numeric scale (a 4px base) already reproduces this system's steps —
 * spacing-lg (12px) is `p-3`, spacing-sm (6px) is `p-1.5`, and so on.
 */
function spacingVars() {
  return Object.entries(tokens.spacing)
    .map(([key, value]) => `  --ds-spacing-${key}: ${value / 16}rem;`)
    .join("\n");
}

/* ------------------------------------------------------------------ write */

const palette = buildPalette();

writeFileSync(
  join(root, "src/app/tokens.generated.css"),
  `${BANNER}\n\n@theme {\n${cssVars()}\n}\n\n:root {\n${spacingVars()}\n}\n`,
);

writeFileSync(
  join(root, "src/core/palette.generated.ts"),
  `${BANNER}

import type { MedicationColor } from "./colors";

/**
 * Medication colors, drawn from the design system's categorical (\`utility\`)
 * families. Ordered for maximum hue separation so the first medications a
 * household adds look as different from each other as the palette allows.
 */
export const MEDICATION_COLORS: MedicationColor[] = ${JSON.stringify(
    palette.map(({ id, name, hex, softHex, onHex }) => ({ id, name, hex, softHex, onHex })),
    null,
    2,
  )};
`,
);

console.log("Wrote src/app/tokens.generated.css and src/core/palette.generated.ts\n");
console.log("Medication palette (in assignment order):");
console.log("  #   id         solid     on-soft   on-solid   dE to nearest earlier");
palette.forEach((color, index) => {
  const earlier = palette.slice(0, index);
  const nearest = earlier.reduce(
    (best, other) => {
      const distance = deltaE(color.hex, other.hex);
      return distance < best.distance ? { id: other.id, distance } : best;
    },
    { id: "—", distance: Infinity },
  );
  const nearestLabel =
    index === 0 ? "—" : `${Math.round(nearest.distance)} (${nearest.id})`;
  console.log(
    `  ${String(index + 1).padStart(2)}  ${color.id.padEnd(10)} ${color.hex}  ` +
      `${String(color.contrastOnSoft).padStart(5)}:1  ` +
      `${String(color.contrastOnSolid).padStart(5)}:1   ${nearestLabel}`,
  );
});

// Report the worst confusable pair across the whole palette.
let worst = { pair: "", distance: Infinity };
for (let i = 0; i < palette.length; i += 1) {
  for (let j = i + 1; j < palette.length; j += 1) {
    const distance = deltaE(palette[i].hex, palette[j].hex);
    if (distance < worst.distance) {
      worst = { pair: `${palette[i].id} / ${palette[j].id}`, distance };
    }
  }
}
console.log(
  `\nClosest pair anywhere in the palette: ${worst.pair} (dE ${Math.round(worst.distance)})`,
);
if (worst.distance < 15) {
  console.warn("  Warning: those two will be hard to tell apart on a colour bar.");
}
