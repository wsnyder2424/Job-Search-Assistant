# Design tokens

The app's visual language comes from the **Pet medication app** Figma file,
which uses Figma **Variables** in the Untitled UI token structure
(`text-primary`, `bg-brand-solid`, `radius-md`, `utility-*`).

```
design/tokens.json               ← the export. The only file you edit by hand.
scripts/build-tokens.mjs         ← generates the files below, and validates them
src/app/tokens.generated.css     ← CSS custom properties (do not edit)
src/core/palette.generated.ts    ← medication palette (do not edit)
```

Regenerate after any change to `tokens.json`:

```bash
npm run tokens
```

`npm run build` runs it automatically, so a stale token file cannot ship.

---

## Re-exporting from Figma

When the design system changes, refresh `design/tokens.json`. Either route
produces the same file; pick whichever is at hand.

### With the Figma connector (how this file was created)

Connect **Figma** under claude.ai → Settings → Connectors, enable it for the
chat, then ask Claude to re-export. Under the hood it calls `get_variable_defs`
against these nodes, which between them reference every variable the system
actually binds:

| Node | What it covers |
| --- | --- |
| `1:19308` | Colors — the full semantic and utility sets |
| `1:20993` | Radius scale |
| `1:22448` | Spacing and grid |
| `1:27391` / `1:27409` | Button, primary and secondary |
| `2:13930` | Checkbox |

File key: `w1fFUO5dYB1zYHPaxmU4lI`.

Note that `get_variable_defs` returns only the variables **bound to nodes in
that subtree** — an unused variable will not appear. If you add a token in
Figma, apply it to something before re-exporting.

Two environment notes, since both cost time to discover:

- Figma's **local** Dev Mode MCP server (`127.0.0.1:3845`) is unreachable from
  a cloud session. Use the hosted connector, which authenticates over OAuth.
- The egress proxy blocks Figma's asset CDN, so screenshots have to be
  requested with `enableBase64Response: true` rather than downloaded by URL.

### By hand

In Figma, select a frame that uses the tokens, then export with the **Design
Tokens** or **Tokens Studio** plugin and fold the values into
`design/tokens.json` in the shape already there.

---

## What the generator checks

`scripts/build-tokens.mjs` is not just a formatter. It refuses to emit a
palette that would be unreadable or confusing, so a token change cannot quietly
degrade the schedule:

1. **Contrast on the tint** — a medication's solid color must clear 4.5:1
   against its own `50` tint, because the hero card renders the countdown that
   way. Families failing at the `600` step are promoted to `700`; eight of the
   ten currently are.
2. **Contrast on the fill** — a label on a solid fill must clear 4.5:1 in white
   or in `text-primary`.
3. **Distance from the brand color** — a medication color within ΔE 20 of
   `bg-brand-solid` is rejected. The brand purple is the app's own chrome
   (primary buttons, focus rings, checked boxes), so a medication wearing it
   stops reading as a medication. **`blue` and `indigo` are excluded for this
   reason**, recorded in `medicationPalette.$excluded`.
4. **Mutual distinctness** — it reports the closest pair in CIE Lab and warns
   below ΔE 15.

The build fails on 1–3 and warns on 4.

### Palette order

`medicationPalette.order` is a greedy farthest-point walk in CIE Lab, because
`assignColor()` hands out the first unused entry: the first medications a
household adds get the colors that look least alike. The first four are ≥77 ΔE
apart, and it degrades gracefully from there. Reordering the array is safe;
re-run `npm run tokens` and read the reported distances.

---

## Two things worth knowing

**Spacing is deliberately not a Tailwind theme namespace.** In Tailwind v4 the
sizing utilities resolve a named key against `--spacing-*` before
`--container-*`, so declaring `--spacing-md` silently redefines `max-w-md` from
28rem to 8px and collapses every layout that uses it. The design system's
spacing is emitted as plain `--ds-spacing-*` properties instead, which the
component recipes in `globals.css` reference directly. Tailwind's own numeric
scale already reproduces this system's steps — `spacing-lg` (12px) is `p-3`,
`spacing-sm` (6px) is `p-1.5`.

**Medication colors are domain data, not styling.** They live in `src/core` so a
React Native client can reuse them, and each medication stores its color by
`id` (`"red"`), never by hex — so re-theming never migrates a database row.
