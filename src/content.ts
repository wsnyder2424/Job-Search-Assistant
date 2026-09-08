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
  /**
   * The case study's real title, shown as the panel heading. Without one the
   * panel falls back to the island's place name — fine for a placeholder,
   * but the actual title of the work should outrank the map label.
   */
  headline?: string
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
  name: 'Whitney Snyder',
  /** The line under your name, in the corner mark and on the intro card. */
  title: 'Product Designer',
  /** The smaller line beneath that, on the intro card only. */
  tagline: 'Just out here, building castles in the sky',
  email: 'hello@example.com', // PLACEHOLDER
  /** Drop your real PDF at public/resume.pdf and this just works. */
  resumeHref: 'resume.pdf',
  resumeFilename: 'whitney-snyder-resume.pdf',
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
    id: 'syndio-permissions',
    kind: 'case-study',
    name: 'Gatehouse Quarter',
    subtitle: 'Case study — access control',
    accent: '#e8814a',
    weight: 1.3,
    seed: 1207,
    study: {
      headline: 'Designing scalable access control for 50K+ pay equity data categories at Syndio',
      summary:
        "Led Syndio's first permissions system 0-to-1 across four engineering teams, translating hierarchical backend constraints into a group-based model after research showed role-based wouldn't scale.",
      role: 'Product designer', // PLACEHOLDER — the "Product management" tag suggests this was broader; scope it the way you'd say it out loud
      timeframe: '2023 — 2024', // PLACEHOLDER
      team: 'Across four engineering teams',
      metrics: [
        { value: '−65%', label: 'Less support tickets' },
        { value: '+$300k', label: 'In contracts saved' },
      ],
      // PLACEHOLDER — the card you sent carried the title, summary, tags and
      // metrics but no narrative, so these are prompts rather than invented
      // copy. The headings are a suggested shape, not a requirement.
      sections: [
        {
          heading: 'The problem',
          body: 'PLACEHOLDER — what was happening before Syndio had a permissions system at all? Who was being let into pay equity data they should not have seen, or locked out of data they needed, and how did that surface?',
        },
        {
          heading: 'Why role-based failed',
          body: 'PLACEHOLDER — this is the sharpest thing on the card. What did the research actually show? Name the moment role-based broke against 50K+ categories, and what convinced four engineering teams to change course.',
        },
        {
          heading: 'Translating the backend',
          body: 'PLACEHOLDER — the backend constraints were hierarchical and the model you shipped was group-based. What was lost in that translation, and how did you keep the interface honest about a structure it was not mirroring?',
        },
        {
          heading: 'Outcome',
          body: 'PLACEHOLDER — how did this cut support tickets by 65% and save $300k in contracts? Which of the two mattered more internally, and what has held up since.',
        },
      ],
      tags: ['Startup', 'B2B SaaS', 'Product management', '0 → 1'],
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
    id: 'attorney-analytics',
    kind: 'case-study',
    name: 'Docket Point',
    subtitle: 'Case study — AI/ML',
    accent: '#7d6ae0',
    weight: 1.05,
    seed: 3391,
    study: {
      headline: 'Driving Analytics Revenue with AI-Powered Attorney Insights',
      summary:
        "Designed Attorney Analytics' argument clusters with data scientists, shifting model output from abstract concepts to the hierarchical topics 80% of attorneys preferred.",
      role: 'Product designer', // PLACEHOLDER — scope this the way you'd say it out loud
      timeframe: '2024 — 2025', // PLACEHOLDER
      team: 'With data scientists',
      metrics: [
        { value: '#1', label: 'Selling product' },
        { value: '+1M', label: 'Attorneys tracked' },
      ],
      // PLACEHOLDER — the card you sent carried the title, summary, tags and
      // metrics but no narrative, so these are prompts rather than invented
      // copy. The headings are a suggested shape, not a requirement.
      sections: [
        {
          heading: 'The problem',
          body: 'PLACEHOLDER — what were attorneys doing before argument clusters existed, and what did the abstract-concept output cost them? Name the moment you saw it go wrong.',
        },
        {
          heading: 'What I did',
          body: 'PLACEHOLDER — how did you work with the data scientists? What did designing a model output actually involve day to day, and what did you have to learn to do it?',
        },
        {
          heading: 'The hard part',
          body: "PLACEHOLDER — the 80% preference figure implies you tested alternatives. What did you try that attorneys rejected, and what did that teach you about how they think?",
        },
        {
          heading: 'Outcome',
          body: 'PLACEHOLDER — how did this become the #1 selling product? What changed for the business, and what has held up since.',
        },
      ],
      tags: ['AI/ML', 'B2B SaaS', 'UX research', 'Enterprise'],
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
