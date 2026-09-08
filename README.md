# Portfolio Archipelago

An interactive product-design portfolio set in a living isometric world. Six
islands ring a central lagoon — three case studies, an about island, a monument
park for accolades, and an airfield where your resume leaves by plane. The
visitor controls the time of day; the city lights up as the sun goes down.

Built with Vite + React + TypeScript + React Three Fiber. Static build, no
server, no CMS, no image assets — every texture and every building is generated
at runtime from one data file.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static bundle into dist/
npm run preview    # serve the production build
npm run typecheck
```

`dist/` is plain static files with relative paths, so it drops onto GitHub
Pages, Netlify, Vercel or any static host with no configuration.

```bash
npm run build:single   # dist-single/portfolio-archipelago.html
```

Inlines the whole build — three.js, React, the shaders, the stylesheet — into
one self-contained HTML file you can open off disk or paste into a host that
only takes a single file. Its only network request is the DM Sans webfont. If
you use it, put `resume.pdf` beside it or point `identity.resumeHref` at an
absolute URL, since that link stays relative.

---

## Everything you need to edit is in two places

### 1. `src/content.ts`

This is the whole site. Nothing else needs touching for a normal update.
Anything currently marked `// PLACEHOLDER` is invented and should be replaced.

| What | Where |
|---|---|
| Your name, title, email, links | `identity` |
| About-island copy and quick facts | `about` |
| Awards — one monument per entry | `accolades` |
| Resume timeline | `resume` |
| The islands themselves | `islands` |

Each island takes:

- **`id`** — the URL slug. `yoursite.com/#/harbor-scheduling` deep-links
  straight to that island with the camera already framed on it.
- **`name` / `subtitle`** — what appears on the floating label.
- **`accent`** — one hex value that drives the island's whole palette: its
  signature tower, its panel accent, its label pin, and a 12% tint through
  every building on it.
- **`weight`** — `0.8`–`1.35`. Bigger island, more land, taller skyline. Use it
  to signal which work you're proudest of.
- **`seed`** — change the number to reroll that island's coastline and street
  layout. Same seed always gives the same city.

Add a seventh island and it places itself: the ring re-spaces, new bridges
connect it to its neighbours, and its label appears. Delete one and the same
thing happens in reverse.

### 2. `public/resume.pdf`

Replace the placeholder PDF with your real one. The filename the visitor's
browser saves it as comes from `identity.resumeFilename` in `content.ts`.

---

## How the metaphor maps

| Section | Island | What it does |
|---|---|---|
| Case study | A dense district, tallest building in its accent colour | Camera flies in, panel opens with the full write-up |
| About | Low walkable old town with a lighthouse on the point | Bio, quick facts, contact |
| Accolades | Parkland with one monument per award, lit after dark | The list, dated |
| Resume | Airfield with a runway, control tower and blinking beacon | Downloading the PDF launches the plane, which rolls out and climbs away over the sea |

---

## Notes for whoever maintains this

A few decisions that are load-bearing and not obvious from the code:

**The orthographic projection has no horizon.** Every ray in an ortho frustum
tilted down at a ground plane hits that plane, so a sky dome is never visible —
it clips to a single flat-coloured cap. The sea therefore doubles as the sky:
distant water is taken over by fog, and the star field lives in the ocean
shader, resolving only where fog dominates. `src/scene/Ocean.tsx` carries the
explanation.

**Fog is linear, not exponential, and anchored to the camera distance.** Under
ortho the whole world sits ~200 units deep regardless of zoom, so exponential
fog swamps everything. `CAMERA_DISTANCE` in `src/lib/layout.ts` is shared
between the camera rig and the fog so the two can't drift apart.

**The day/night value lives outside React.** `src/lib/env.ts` is a mutable
singleton; the scene reads it in `useFrame` and mutates materials directly.
Scrubbing the time slider costs zero React re-renders. The interface tokens
follow the same value through a CSS custom property, which is why the panels
change colour with the sky.

**Buildings are instanced with per-instance emissive UVs.** A single window
texture is shared by every building, and a patched `MeshStandardMaterial`
scales the emissive-map UVs per instance so a 13-unit tower shows more window
rows than a 2-unit shed. Without it every building shows the same eight rows
and the city reads as fake immediately.

**Accessibility.** The island labels are real `<button>` elements and all panel
content is real HTML, so the whole site is keyboard-navigable and legible to a
screen reader despite being a canvas. `prefers-reduced-motion` skips the
opening fly-in entirely and stops the ambient time drift.

**Device tiering** lives in `src/lib/quality.ts`. Coarse pointers, narrow
viewports, low core counts or low reported memory drop shadows, halve the ocean
tessellation, cut the ferry count and cap the pixel ratio. One code path, two
budgets.

---

## Project layout

```
src/
  content.ts          ← all copy and island data (edit this)
  store.ts            ← selection, deep links, plane launch
  App.tsx             ← canvas + interface shell
  lib/
    layout.ts         ← procedural archipelago: islands, bridges, ferry routes
    env.ts            ← day/night keyframes and derived light values
    palette.ts        ← per-island colour derivation from one accent
    textures.ts       ← canvas-generated window and falloff textures
    quality.ts        ← device tiering
    rng.ts            ← seeded PRNG
  scene/
    City.tsx          ← composes the world
    CameraRig.tsx     ← intro flight, fly-to focus, panel-aware framing
    Ocean.tsx         ← sea, and by necessity the sky
    Island.tsx        ← land, instanced skyline, per-kind landmarks
    Bridges.tsx  Ferries.tsx  Plane.tsx  Lighting.tsx  Labels.tsx
  ui/
    Panel.tsx  Hud.tsx  Intro.tsx
  styles.css          ← design tokens, day and night
```
