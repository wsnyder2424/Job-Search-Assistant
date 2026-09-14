# Presentation animations

`presentation/` holds the slide animations for the PayFinder case-study deck.
Each slide is a self-contained HTML file with no build step and no runtime
dependency — open it in a browser and it plays.

## Motion: everything moves on a bezier

**Standing rule. It applies in both senses, and both are required:**

- **Path.** Anything that travels from A to B takes a curved route, never a
  straight line. Build it as a quadratic bezier whose control point sits off to
  one side of the midpoint, sample it into keyframes, and animate `transform`
  through them. The `arc(from, to)` helper in slides 02, 03, 04 and 06 is the
  reference implementation: the bow is perpendicular to the travel and scales
  with the distance (22%, capped at 70px), so short hops stay nearly straight
  and long ones swing wide.

- **Easing.** Never `linear`. Every duration is shaped by a `cubic-bezier`.

A straight-line `translate` between two points is the thing this rule exists to
prevent — it reads as mechanical, and it is the default you get for free, so it
needs actively replacing every time.

**One deliberate exception**, recorded here so it isn't mistaken for an
oversight: the propagation pulse in slide 03 travels an arc but with `linear`
easing. A strong ease made it cover most of the gap in the first fifth of its
time and then hang at the destination. Its *path* obeys the rule; its *rate* is
constant on purpose. Overrule this if you'd rather it eased.

## Shared conventions

These hold across the deck; match them in anything new.

- **Stage.** A 1600×900 logical stage, scaled to fit the window in `fit()`. All
  geometry is authored in those coordinates, so the slide projects at any size.
- **`HOLD`.** One constant per slide: how long it sits still before anything
  moves. Timed to the narration, so it varies (5s to 30s). Nothing at all should
  move during the hold — including a pointer fading in.
- **`RATE`.** One constant that stretches everything *after* the hold without
  retiming anything individually. Applied inside the `animate` helper, which
  scales each duration and re-bases each delay around `HOLD`.
- **Reduced motion.** Every slide honours `prefers-reduced-motion` by showing
  its end state immediately.
- **Replay.** Click anywhere, or press space / R.
- **Positions.** Read control positions from the live layout (stage
  coordinates), not hardcoded numbers, so they survive edits and any projection
  size. Where elements are mid-animation when the timeline is built, use layout
  offsets (`offsetLeft`/`offsetTop`) rather than `getBoundingClientRect`, since
  those ignore transforms.

## Style

Slides 01–03 and 05, 07 are grey skeleton mockups. Slides 04 and 06 use real
PayFinder UI and its Figma tokens (`#007B80` teal 500, `#30BCC0` teal 400,
`#61A058` green 500, `#B0B0B0` gray 600, `#2E2E2E` text primary). The slide
ground is `#FDFDFC` throughout.

`tools/slide-to-svg.mjs` exports a static slide to a flat SVG for Figma.
