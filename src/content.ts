/* ============================================================================
 *  THE ONLY FILE YOU NEED TO EDIT.
 * ----------------------------------------------------------------------------
 *  Every word, name, number and colour on the site comes from here. The 3D city
 *  is generated from this data: change an island's `weight` and it gets bigger,
 *  change its `accent` and its buildings recolour, add a new island to the
 *  `islands` array and it is automatically placed in the ring with bridges to
 *  its new neighbours.
 *
 *  Everything currently marked  // PLACEHOLDER  is invented. Replace it.
 * ========================================================================== */

export interface Metric {
  /** Big number. Keep it short — it renders large. e.g. "+38%", "1.2M", "4 wks" */
  value: string
  /** What the number means. e.g. "task completion", "monthly actives" */
  label: string
}

export interface CaseStudyBody {
  /** One line under the title in the panel. The elevator pitch. */
  summary: string
  /** Your role, honestly scoped. */
  role: string
  /** e.g. "2024 — 2025" */
  timeframe: string
  /** Who you did it with. Team, agency, or "Solo". */
  team: string
  /** Up to 3. They render as a row of big numbers. Use 0 if you have none. */
  metrics: Metric[]
  /** The narrative. Each entry becomes a titled block in the panel. */
  sections: { heading: string; body: string }[]
  /** Small pills at the bottom of the panel. */
  tags: string[]
  /** Optional outbound link, e.g. to a live product or a longer write-up. */
  link?: { label: string; href: string }
}

export type IslandKind = 'case-study' | 'about' | 'accolades' | 'resume'

export interface Island {
  /** URL slug. Becomes the deep link: yoursite.com/#/harbor-district */
  id: string
  kind: IslandKind
  /** The island's name on its floating label. Lean into the place-name conceit. */
  name: string
  /** Small line under the name on the label. */
  subtitle: string
  /** Hex. Drives the island's signature building colour and its panel accent. */
  accent: string
  /**
   * Relative size, 0.8 – 1.35. Bigger island = more land, more buildings, taller
   * skyline. Use it to signal which work you're proudest of.
   */
  weight: number
  /** Seeds the procedural layout. Change the number to reroll the island's shape. */
  seed: number
  /** Case-study islands use this. Other kinds ignore it. */
  study?: CaseStudyBody
}

/* -------------------------------------------------------------------------- */
/*  YOU                                                                        */
/* -------------------------------------------------------------------------- */

export const identity = {
  name: 'Your Name', // PLACEHOLDER
  title: 'Product Designer', // PLACEHOLDER
  /** Shown on the intro title card, under your name. One line, no period. */
  tagline: 'Six islands. Three case studies. One resume that leaves by plane', // PLACEHOLDER
  email: 'hello@example.com', // PLACEHOLDER
  /** Drop your real PDF at public/resume.pdf and this just works. */
  resumeHref: 'resume.pdf',
  resumeFilename: 'your-name-resume.pdf', // PLACEHOLDER
  links: [
    { label: 'LinkedIn', href: 'https://linkedin.com/in/your-handle' }, // PLACEHOLDER
    { label: 'Read.cv', href: 'https://read.cv/your-handle' }, // PLACEHOLDER
  ],
}

/* -------------------------------------------------------------------------- */
/*  ABOUT ISLAND                                                               */
/* -------------------------------------------------------------------------- */

export const about = {
  /** 2–4 short paragraphs. Write like a person, not a LinkedIn headline. */
  paragraphs: [
    // PLACEHOLDER — all three paragraphs
    'I design software for people who did not ask to be using software. Most of my work lives in the unglamorous middle of a product: the settings that nobody owns, the empty state that decides whether someone comes back, the flow that six teams each redesigned separately.',
    'I started in editorial design and came to product through a newsroom tools team, which is where I learned that the fastest way to understand a system is to sit next to someone fighting it. I still do that first, before opening any design file.',
    'Currently based in Brooklyn. Reachable, opinionated, and easy to disagree with productively.',
  ],
  /** Rendered as a two-column list of short facts. Keep each side terse. */
  facts: [
    { label: 'Based in', value: 'Brooklyn, NY' }, // PLACEHOLDER
    { label: 'Years designing', value: '9' }, // PLACEHOLDER
    { label: 'Best at', value: 'Complex systems, 0→1, design systems' }, // PLACEHOLDER
    { label: 'Currently', value: 'Open to senior / staff roles' }, // PLACEHOLDER
  ],
}

/* -------------------------------------------------------------------------- */
/*  ACCOLADES ISLAND                                                           */
/* -------------------------------------------------------------------------- */
/*  Each entry becomes a lit monument in the park. 3–7 works best — fewer and   */
/*  the park looks empty, more and they crowd each other.                       */

export const accolades: { year: string; title: string; body: string }[] = [
  // PLACEHOLDER — every entry below
  {
    year: '2025',
    title: 'Fast Company Innovation by Design — Finalist',
    body: 'Recognised in the Apps & Interfaces category for the Harbor scheduling rebuild.',
  },
  {
    year: '2024',
    title: 'Webby Honoree — Best Productivity Tool',
    body: 'One of five honorees for a tool that started as an internal hack week project.',
  },
  {
    year: '2024',
    title: 'Internal Craft Award',
    body: 'Voted by the design org for the accessibility work behind the component library rewrite.',
  },
  {
    year: '2022',
    title: 'Speaker — Config',
    body: 'Talk: "The settings page is a product strategy document." ~1,400 in the room.',
  },
]

/* -------------------------------------------------------------------------- */
/*  RESUME ISLAND                                                              */
/* -------------------------------------------------------------------------- */

export const resume = {
  /** Shown in the panel before the download. Keep it to a skimmable timeline. */
  timeline: [
    // PLACEHOLDER — every entry below
    { period: '2023 — now', role: 'Senior Product Designer', org: 'Harbor', note: 'Scheduling and capacity planning for operations teams.' },
    { period: '2020 — 2023', role: 'Product Designer', org: 'Meridian', note: 'Design systems, then the 0→1 mobile product.' },
    { period: '2017 — 2020', role: 'Product Designer', org: 'The Daily Ledger', note: 'Newsroom tooling and the subscriber experience.' },
    { period: '2015 — 2017', role: 'Designer', org: 'Freelance', note: 'Editorial and brand work for small publishers.' },
  ],
}

/* -------------------------------------------------------------------------- */
/*  THE ARCHIPELAGO                                                            */
/* -------------------------------------------------------------------------- */
/*  Order matters — islands are placed clockwise around the ring in this order, */
/*  and bridges connect each island to its neighbours in this list.             */

export const islands: Island[] = [
  {
    id: 'harbor-scheduling',
    kind: 'case-study',
    name: 'Harbor District', // PLACEHOLDER
    subtitle: 'Case study — scheduling at scale', // PLACEHOLDER
    accent: '#e8814a',
    weight: 1.3,
    seed: 1207,
    study: {
      // PLACEHOLDER — this entire block
      summary:
        'Rebuilt the scheduling core of an operations platform used by 40,000 shift workers, replacing a spreadsheet-shaped grid with a planning surface people could actually reason about.',
      role: 'Lead product designer',
      timeframe: '2023 — 2025',
      team: 'With 1 researcher, 6 engineers, 1 PM',
      metrics: [
        { value: '−62%', label: 'time to publish a schedule' },
        { value: '+38%', label: 'shifts filled without escalation' },
        { value: '40k', label: 'workers on the new surface' },
      ],
      sections: [
        {
          heading: 'The problem',
          body: 'Managers were building schedules in our product and then rebuilding them in Excel, because our grid could show a week but could not answer "who is about to hit overtime." The product had the data and hid it. Support tickets were a proxy for a missing view, not a missing feature.',
        },
        {
          heading: 'What I did',
          body: 'I ran two weeks of shadowing across three sites before drawing anything, and mapped every decision a manager makes between an open shift and a published week. That map became the information architecture: constraints surface where the decision happens, not in a separate compliance tab.',
        },
        {
          heading: 'The hard part',
          body: 'Every constraint we surfaced made the interface louder. We shipped three versions of the warning system before landing on one that ranks by consequence rather than by rule type — a change that came directly from watching a manager ignore eleven identical yellow banners in a row.',
        },
        {
          heading: 'Outcome',
          body: 'Schedules that took a full afternoon now take under 90 minutes, and the Excel workaround has effectively disappeared at the pilot sites. The constraint-ranking model has since been adopted by two other teams.',
        },
      ],
      tags: ['Enterprise', 'Complex systems', 'Research-led', 'Design systems'],
      link: { label: 'Read the long version', href: 'https://example.com' },
    },
  },
  {
    id: 'meridian-onboarding',
    kind: 'case-study',
    name: 'Meridian Heights', // PLACEHOLDER
    subtitle: 'Case study — 0→1 mobile', // PLACEHOLDER
    accent: '#4a9ee8',
    weight: 1.15,
    seed: 8842,
    study: {
      // PLACEHOLDER — this entire block
      summary:
        'Took a mobile companion app from a one-page brief to launch in nine months, and found out in week three that the brief was aimed at the wrong person.',
      role: 'Product designer (founding designer on the app)',
      timeframe: '2021 — 2022',
      team: 'With 4 engineers, 1 PM',
      metrics: [
        { value: '4.7★', label: 'App Store rating at 6 months' },
        { value: '61%', label: 'D30 retention' },
        { value: '9 mo', label: 'brief to launch' },
      ],
      sections: [
        {
          heading: 'The problem',
          body: 'Leadership wanted a mobile version of the desktop product. Interviews said something else: nobody wanted to do desktop work on a phone. They wanted to know whether they needed to open the desktop product at all.',
        },
        {
          heading: 'The pivot',
          body: 'I reframed the app from "companion" to "answer machine" — one screen, one status, one action. That argument was won with a two-day clickable prototype and five recorded sessions, not a deck.',
        },
        {
          heading: 'What shipped',
          body: 'A single-surface app with a status card, a notification model tuned to be interruptible only when action is genuinely required, and a deliberately narrow feature set that we defended for two years.',
        },
      ],
      tags: ['0→1', 'Mobile', 'Reframing', 'Prototyping'],
    },
  },
  {
    id: 'ledger-design-system',
    kind: 'case-study',
    name: 'Foundry Point', // PLACEHOLDER
    subtitle: 'Case study — design systems', // PLACEHOLDER
    accent: '#7d6ae0',
    weight: 1.05,
    seed: 3391,
    study: {
      // PLACEHOLDER — this entire block
      summary:
        'Rebuilt a 200-component library that three product teams had quietly stopped using, and got adoption back above 90% by treating the system as a product with users rather than a rulebook with violators.',
      role: 'Design systems lead',
      timeframe: '2020 — 2021',
      team: 'With 2 designers, 3 engineers',
      metrics: [
        { value: '92%', label: 'component adoption' },
        { value: '200→74', label: 'components after audit' },
        { value: 'AA', label: 'WCAG across the library' },
      ],
      sections: [
        {
          heading: 'The problem',
          body: 'The library was technically complete and socially dead. Teams forked components rather than request changes, because requesting a change took six weeks and forking took an afternoon.',
        },
        {
          heading: 'What I did',
          body: 'I audited every fork in the codebase and treated each one as a bug report about the system. Two thirds of them pointed at four missing capabilities. We shipped those, deleted 126 components nobody used, and published a contribution path with a two-day SLA.',
        },
        {
          heading: 'Outcome',
          body: 'Adoption recovered within two quarters and stayed. The accessibility pass that came with the rewrite took the whole library to WCAG AA, which had previously been tracked as 14 separate team-level tickets that never moved.',
        },
      ],
      tags: ['Design systems', 'Accessibility', 'Governance'],
    },
  },
  {
    id: 'about',
    kind: 'about',
    name: 'Old Town', // PLACEHOLDER
    subtitle: 'About me',
    accent: '#59a97a',
    weight: 0.95,
    seed: 5510,
  },
  {
    id: 'accolades',
    kind: 'accolades',
    name: 'Monument Park', // PLACEHOLDER
    subtitle: 'Awards & recognition',
    accent: '#e0b445',
    weight: 0.9,
    seed: 7723,
  },
  {
    id: 'resume',
    kind: 'resume',
    name: 'Departures Field', // PLACEHOLDER
    subtitle: 'Resume — leaves by plane',
    accent: '#d95f7a',
    weight: 1.0,
    seed: 2064,
  },
]

export const findIsland = (id: string | null) =>
  id ? islands.find((i) => i.id === id) ?? null : null
