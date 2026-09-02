# design.md — Medication app

> Context doc for Claude Code. Read this before touching any UI or product logic.
> Based on the 12-part design.md template (serenainux). Sections marked _TODO_ are not yet answered — ask Whitney rather than guessing.

## 1. Product in one sentence
What it is, who it's for, and what it must never become.

**Sentence:** A mobile app that lets the people caring for a dog or cat — the owner, a partner, a pet-sitter — share one record of which medications are due and which have been given, designed first for the acute case (a short course after surgery or illness), not long-term chronic meds.

**Who:** Pet owners of dogs and cats. Single or multiple users per pet. Sharing is not limited to a household — a pet-sitter is the canonical outside collaborator.

**Designing first for:** the acute case (short course, has an end date). Chronic/long-term meds are supported later, not designed for now.

**Notifications:** one push notification 5 minutes before a dose is due. If several medications are due at the same time, they appear together in a single notification. If the dose is not marked as given, one follow-up push: "Did Aga get her meds?" with three actions — "Yes, given" / "No, remind me in 5 minutes" / "Don't remind me again this time". No other pushes — with one exception: if a caregiver taps "No, remind me in 5 minutes", a third push follows after the snooze period. Only a caregiver-requested snooze may take a round past two notifications.

**Must never become:** a health-data dashboard, a pharmacy, a symptom checker, a chat. Mobile only — no desktop app (see §10).

## 2. Job to be done
What the user is actually trying to accomplish. Success and failure in observable terms.

**The situation:** A pet comes home from the vet with several medications, each on its own schedule, with different start times and different instructions ("one drop, right eye", "give with food"). The vet hands over a printed sheet. Several people care for the pet across the day — in shifts, sometimes trading off at a moment's notice — plus occasional outsiders (a sitter on Friday night).

**The job:** Take something tricky and high-stakes — a multi-medication course with multiple caregivers — and make it easy to understand and follow, so no dose is missed or doubled no matter who is holding the pet.

**Two sub-jobs, in order of anxiety:**
1. **Setup** — turning the vet's sheet into one grouped, efficient schedule. Highest-anxiety moment of the whole course. Today this needs an AI to group the meds and assign each a color so nobody has to remember hard drug names.
2. **Handoff** — knowing, at a glance, what has been given and what is next, when the person who gave the last dose isn't you. The guest must be able to check off a dose without creating an account, and it must show up in the owners' records.

**Other anxiety moments:** thinking you forgot something; running out of a medication.

**Success looks like (observable):**
- Every dose in the course is marked given, by whoever gave it, within its window.
- Zero doses given twice.
- The guest completes their shift's doses without texting the owners a question.
- The owner can look at the app once and answer "what's next and did the last one happen?"

**Failure looks like (observable):**
- Two caregivers each give the same dose.
- A dose is missed because the person on shift didn't know it was due.
- The owner falls back to the vet's paper sheet or a text thread to coordinate.

**Real reference case:** Whitney's shih tzu Aga, post eye-surgery, cared for by Whitney and her husband in shifts, with a babysitter giving meds on Friday.

## 3. App words
Small dictionary for this product. Use these words; do not invent new ones.

| Word | Meaning | Do NOT call it |
|------|---------|----------------|
| Dose screen | The home screen: one list of rounds, opening zoomed in on the next round | dashboard, today view, schedule, home |
| Pet | The dog or cat | patient, animal |
| Course | The whole medication plan from the vet, with an end date | regimen, treatment plan, protocol, schedule |
| Rx | One medication in the course; has its own color | med, drug, prescription, medication (in UI) |
| Dose | One scheduled giving of one Rx | administration, event, task |
| Round | The medicine given at one time — one or more doses; shown and notified as one unit. A lone dose is still a Round | group, batch, slot |
| Due | The time a dose or round should be given | scheduled |
| Given | Dose marked done, by a named caregiver | completed, administered, logged, taken |
| Not given | Dose that was missed. Explicit state, set via "Don't remind me again this time" | skipped, failed, missed (in UI) |
| Overdue | Dose past its due time that is not yet Given or Not given | late, missed |
| Skipped | Dose deliberately not given (e.g. vet said hold it). Exists in-app; where it's set is undecided | not given, cancelled |
| Caregiver | Anyone who gives doses — owner, partner, guest. No separate word for the owner; the owner gets a distinct visual treatment instead | user, member, collaborator |
| Guest | Caregiver invited by share link; has no account | sitter, viewer, collaborator |
| Sheet | The vet's printed instructions that the course is built from | document, prescription, form |
| Instructions | Per-Rx notes, e.g. "one drop, right eye", "give with food" | directions, notes, details |

## 4. Point of view
One strong bias that guides every design decision.

**The next round is the product. Everything else stays quiet.**

What that means in practice:
- The app opens on the next round — what's due, when, in which colors. That view gets the most space, the largest type, and the strongest color.
- The course, history, Rx details, caregivers, and settings are all secondary. They exist, but they never compete with the next round for attention.
- When two principles conflict, this one wins. Two secondary biases inform it but do not override it:
  1. Nobody should have to remember a drug name — color is the identity of each Rx.
  2. Any caregiver, any moment, zero context — the husband mid-shift or a guest opening the link for the first time must be able to act correctly in five seconds.
- **The dose screen is one list with a dynamic view.** Default state: the next round is zoomed in — it fills the view. A downward drag on the round shrinks it and it sinks into its place in the full list of rounds (past and upcoming). There are not two screens ("today" and "schedule"); there is one list and a zoom level. When the round shrinks, the list is positioned around that round — the one that was just minimized — with earlier rounds above and later rounds below. Given rounds keep their Rx colors in the list; they do not fade to neutral.
- Routine actions stay small: a notification never has more than three actions. Don't add a fourth to solve an edge case — find another home for it.

## 5. Visual contract
Tokens and actual specs, pulled from the Figma file **Pet-medication-app** (`w1fFUO5dYB1zYHPaxmU4lI`). Use the token names, not raw values, in code. If output violates these, reject it.

**Source of truth:** Figma variables in the "Colors", "Fonts", and "Spacing radius and grid" sections. The file is an Untitled UI–style foundation kit; values below are what it currently contains.

**Type** — two families. **Display: League Spartan** (Google Fonts) — screen titles and the one big thing. **Body: Inter** — everything else. Weights: regular 400, medium 500, semibold 600, bold 700. The Inter scale below applies to body; display uses the `display-32` token.

| Token | Size / line height |
|---|---|
| text-xs | 12 / 18 |
| text-sm | 14 / 20 |
| text-md | 16 / 24 |
| text-lg | 18 / 28 |
| text-xl | 20 / 30 |
| display-xs | 24 / 32 |
| display-sm | 30 / 38 |
| display-md | 36 / 44 (letter-spacing −2) |
| display-lg | 48 / 60 (−2) |
| display-xl | 60 / 72 (−2) |
| display-2xl | 72 / 90 (−2) |

**Type roles (decided):**
- Base / body: 16px, line-height 1.5 (24), regular → `text-md/Regular`
- Display (screen titles, the one big thing): **League Spartan, 32px, line-height 1.2 (38), semibold**. Not in the kit's scale (xs 24 / sm 30 / md 36) — add a `display-32` token to Figma; do not round to 30 or 36.
- Next-round time **and** Rx name: 16px, 1.5, semibold → `text-md/Semibold`. Same style on purpose — neither outranks the other; color does the differentiating.
- Instructions: 14px, 1.5 (21), regular → `text-sm/Regular` (kit line-height is 20; use 21 to keep the 1.5 ratio).

**Spacing** — base unit 4px. Named scale: xxs 2, xs 4, sm 6, md 8, lg 12, xl 16, 2xl 20, 3xl 24, 4xl 32, 5xl 40, 6xl 48, 7xl 64, 8xl 80. Mobile container padding: 16 (`container-padding-mobile`).

**Radius** — none 0, xxs 2, xs 4, sm 6, md 8, lg 10, xl 12, 2xl 16, 3xl 20, 4xl 24, full 9999.
- **Button radius: 12px** (`radius-xl`)
- **Round surface radius: 12px** (`radius-xl`)
- Everything else that needs a corner uses 12 too unless this doc says otherwise. Do not introduce 8 or 16.

**Neutrals** — the kit's semantic tokens are mapped to the Neutral ramp:
- bg-primary #ffffff · bg-secondary #fafafa · bg-tertiary #f5f5f5 · bg-quaternary #e5e5e5
- text-primary #171717 · text-secondary #404040 · text-tertiary #525252 · text-quaternary/placeholder #737373
- **Body text is text-secondary #404040.** text-primary #171717 is reserved for the display type and the next round. (Resolved: §12 asks for dark gray, not black.)
- border-primary #d4d4d4 · border-secondary #e5e5e5 · border-tertiary #f5f5f5
- **Borders use `alpha-black-10` (#0000001a), not the solid border-primary #d4d4d4.** (Resolved: §12 asks for soft gray with opacity.)

**Brand — Mint.** Primary brand color is **#BBF7D0** (`Colors/Green/200`). Remap the kit's Brand ramp to Green: brand-50 #f0fdf4, 100 #dcfce7, **200 #bbf7d0**, 300 #86efac, 400 #4ade80, 500 #22c55e, 600 #16a34a, 700 #15803d, 800 #166534, 900 #14532d. The kit's purple (#7f56d9 etc.) is a placeholder and must not appear.
- #BBF7D0 is a pale tint. It is a **surface** color — backgrounds, the brand highlight, the owner's visual treatment — never a text or icon color, and never a solid button fill with white text. Text on a mint surface is text-primary #171717. Brand-colored text or icons on white use green-700 #15803d or darker.
- Because success also maps to green (#16a34a), the brand tint and the success state will look related. Acceptable for v1; do not use the mint tint to mean "given".

**Status** — error #dc2626 / bg #fef2f2 · warning #ca8a04 / bg #fefce8 · success #16a34a / bg #f0fdf4.

**Rx colors** — the app assigns, the owner can swap. Max 16. Assigned **in this order**, so the first few Rx in any course are maximally distinct from each other and from the mint brand. Green is excluded (the brand is a green tint).

**Saturation (resolved):** Rx **surfaces and chips use the 100 step** (pastel tint, per §12). **Text and icons in that color use the 700 step.** The **500 step is only for small solid marks** — a dot, a check — where a tint would vanish. The assignment order below is unchanged.

| # | Name | 100 (surface) | 500 (solid mark) | 700 (text/icon) |
|---|---|---|---|---|
| 1 | Blue | #dbeafe | #3b82f6 | #1d4ed8 |
| 2 | Rose | #ffe4e6 | #f43f5e | #be123c |
| 3 | Amber | #fef3c7 | #f59e0b | #b45309 |
| 4 | Violet | #ede9fe | #8b5cf6 | #6d28d9 |
| 5 | Teal | #ccfbf1 | #14b8a6 | #0f766e |
| 6 | Orange | #ffedd5 | #f97316 | #c2410c |
| 7 | Fuchsia | #fae8ff | #d946ef | #a21caf |
| 8 | Sky | #e0f2fe | #0ea5e9 | #0369a1 |
| 9 | Emerald | #d1fae5 | #10b981 | #047857 |
| 10 | Red | #fee2e2 | #ef4444 | #b91c1c |
| 11 | Indigo | #e0e7ff | #6366f1 | #4338ca |
| 12 | Yellow | #fef9c3 | #eab308 | #a16207 |
| 13 | Pink | #fce7f3 | #ec4899 | #be185d |
| 14 | Cyan | #cffafe | #06b6d4 | #0e7490 |
| 15 | Purple | #f3e8ff | #a855f7 | #7e22ce |
| 16 | Lime | #ecfccb | #84cc16 | #4d7c0f |

Rules: an Rx color is never reused within one course. Color is always paired with the Rx name — never color alone (color-blind caregivers, and the guest who has never seen the app). Rx colors are identity, not status: do not use red/amber/green from this table to mean error/warning/success.

**Shadows** — shadow-xs (0 1 2, 5% black); shadow-lg (3-layer). Skeuomorphic inner-border variant exists for buttons.

**Background (resolved)** — `bg-primary` #ffffff is the default everywhere. A barely-there soft gradient (§12) is an optional treatment for the **dose screen only**.

**Theme** — light only. No dark mode in v1.

## 6. Existing components
Components that already exist in the Figma file. Reuse them; do not invent twins.

- Icons (section "Icons")
- Buttons (section "Buttons") and Button groups
- Badges
- Checkboxes

Everything else — the dose screen (zoomed round ↔ full list, with the gesture between them), the round surface, dose rows, Rx color chips, the course timeline, share-link sheet, sheet-capture camera flow, inputs — does **not** exist yet. **Process:** Claude Code builds these from the §5 tokens in code, produces several iterations for Whitney to react to, and the chosen versions are pushed back into Figma. Do not restyle the four existing families above.

## 7. Always / never
Explicit rules and boundaries.

**Always**
- Open on the dose screen, zoomed in on the next round.
- Show the schedule extracted from the sheet for owner confirmation before any dose becomes live.
- Record who marked a dose Given (owner, partner, or guest) and when.
- Pair an Rx color with the Rx name. Color never appears alone.
- Keep every notification to three actions or fewer.
- Keep given rounds in their Rx colors.

**Never**
- Auto-save a dose amount, time, or instruction the owner hasn't seen and confirmed.
- Give medical advice, interpret symptoms, or suggest changes to the vet's instructions.
- Require a guest to create an account.
- Show more than one round as "next".
- Use Rx colors to mean status (error / warning / success), or the mint brand tint to mean Given.
- Add a screen, tab, or view that competes with the dose screen for attention.
- Set labels or subtitles in all caps.
- Use hard (0–4px) corners, dark surfaces as the default theme, or crop images at the edges.

## 8. Closed decisions
Already decided. Do not reopen in new conversations.

- **v1 is sheet-to-schedule.** Setup starts from the vet's printed sheet (photo → grouped, color-coded schedule). Manual entry is a fallback/edit path, not the primary flow.
- **Acute case first.** Every course has an end date. Chronic/ongoing meds are out of scope for v1.
- **Guests do not create accounts.** A guest caregiver is invited by share link. Anyone holding the link can mark doses — accepted trade-off.
- **Share links expire.** There is a default expiry; the owner can edit it when creating the link.
- **Notifications are exactly two per round:** 5 minutes before due, and one follow-up if the round is not marked given. See §1 for the follow-up's three actions.
- **"Don't remind me again this time" records the dose as Not given.** Not given means missed. It is an explicit, visible state — not the same as an untouched dose, and not a "skip".
- **Notification actions are capped at three.** Routine tasks must not require scanning options.
- **Skipped exists, but not in the notification.** A deliberate "skipped" state (e.g. vet said hold it) will be in the app. It is NOT a fourth notification action. One entry point is now settled — an Overdue round can be marked Skipped (see below); whether it can also be set ahead of time is still open. See §11.

_Resolved 2026-09-02, in answer to the open conflicts below:_

- **A Round is the medicine given at one time — one or more doses.** A lone dose is a Round; there is no second unit for un-grouped doses. §3 updated.
- **Doses within an hour of each other are flattened onto one time and become one Round.** The grouping rule the setup flow applies to the vet's sheet. The flattened time is always shown on the confirm schedule screen and never goes live unconfirmed (§7).
- **The dose window is 30 minutes.** A dose can be marked Given from 30 minutes before its due time; it becomes Overdue 30 minutes after.
- **Overdue never clears itself.** A round stays Overdue until a human acts on it — marking it **Given** or **Skipped**. Nothing ages out, nothing auto-transitions. ("Not given" is still set only by the notification's "Don't remind me again this time".)
- **A snooze is the one allowed third notification.** "No, remind me in 5 minutes" fires one more push after the snooze. Everything else stays at two per round.
- **Partner is a caregiver type with two shapes.** When a couple trades off frequently, the partner creates an account (Apple / Google, same as the owner). When their care is episodic, a share link suits it. The owner chooses at invite time; the data model must support a caregiver backed by either an account or a link.
- **A guest name is captured once per link, and later openers inherit it.** The second person to open the same link does not get their own name prompt — Given records the name the link already holds.
- **One pet in v1.** No pet switcher, no multi-pet navigation.
- **The shrink gesture is a downward drag** on the zoomed round.
- **Display face is League Spartan** (Google Fonts); body stays Inter. See §5.

## 9. Graveyard
Ideas already rejected, and why.

| Idea | Why it was rejected |
|------|---------------------|
| "Running low / X doses left" warning | Deferred from v1. Needs quantity dispensed, which the vet sheet often doesn't state. Revisit — it targets a real anxiety moment. |
| Health-data dashboard, symptom checker, pharmacy, chat | Not what the product is. See §1. |

## 10. Hard limits
Technical and product constraints.

**Builder:** solo, no backend experience, no budget yet. Every technical choice must be the boring, managed, well-documented one. If a decision needs a server to be run or patched by hand, it's the wrong decision.

**Platform:** React Native, mobile only. Target is the Apple App Store first; Android is not a v1 requirement but nothing should block it. No desktop, no web app for owners.

**Backend:** Supabase — Postgres, Auth, Storage, Edge Functions, Realtime. No other backend services unless this doc is updated.

**Owner auth:** Sign in with Apple and Google only. No email/password, no phone number, no magic links. (Apple requires Sign in with Apple when Google sign-in is offered — both ship together.)

**Guests:** no account. A guest is a share link with an expiry (default TBD, owner-editable). The link opens a **mobile web page** — the guest never has to install the app. That page shows the dose screen for the pet and lets the guest mark doses Given; it is the only web surface in the product, and it is for guests only (owners use the app). Same tokens, same words, same states.

**Notifications:** server-sent push (Expo Push / APNs via a Supabase Edge Function or scheduled job), not local. Required so that any caregiver marking a dose Given cancels the follow-up prompt for everyone else. Exactly two per round: T−5 min, and the follow-up if not marked Given.

**Sheet-to-schedule:** the sheet photo leaves the phone and is read by a hosted vision/LLM API. Provider is not yet chosen — pick one, isolate it behind a single function so it can be swapped, and treat its output as a draft the owner must confirm (§7). Never let extracted values write directly to live doses.

**Data:** a pet's medication record is shared across caregivers, so the source of truth is Supabase, not the device. Offline reads should work from cache; offline writes (marking Given) must queue and sync, never be lost.

**App Store:** the app must pass review — privacy manifest, no medical-advice claims, clear data-use disclosure for the sheet photo.

## 11. States you must design
Not only the happy path. Each state is named by screen.

**Dose screen**
- Empty (no course yet): a single clear path to "add a sheet" — the camera. Nothing else competes.
- Next round zoomed in: the default (§4).
- List view: after the shrink gesture, positioned around the minimized round (§4).
- Round states — Given, Not given, Skipped, Overdue — **each gets its own icon.** Icon design is a design-exploration item. Rx colors stay as they are in every state; the only state that may add a color treatment of its own is **Overdue**. Whether the others need any color at all is an open question for iteration — default to icon only.
- Round Given: Rx colors + Given icon; shows who gave it and when.
- Round Not given: Rx colors + Not given icon. Explicit and distinct from untouched.
- Round Skipped (deliberate): Rx colors + Skipped icon. Settable from an Overdue round (§8); whether it can also be set ahead of the due time is still open.
- Round Overdue (30 min past due, not yet acted on): Rx colors + Overdue icon, plus possibly a color treatment — TBD. Clears only when a human marks it Given or Skipped; it never ages out on its own.
- Course over: **a celebration.** Stats — doses given, across how many days — and a small celebratory animation. The course then closes; the dose screen returns to Empty (or the next course, if one exists).

**Sheet-to-schedule**
- Camera permission denied: explain why the camera is needed; offer Settings; offer manual entry as the alternative.
- Capturing: framing guidance for a printed sheet.
- Reading (loading): the API call. Can take several seconds — show progress, never a blank screen.
- Read failed / unreadable: retake or enter manually. Never a dead end.
- Confirm schedule: the extracted Rx list with colors, times, and instructions, editable, before anything goes live. This is the highest-anxiety moment of the product (§2) — design it with the most care.

**Guest link**
- Link opened, valid: the dose screen for that pet, with the guest's name captured once so Given records who.
- Link expired: an illustration and "Sorry, this link has expired." Nothing else — no sign-up prompt.
- Link revoked or pet deleted: same treatment as expired.

**Notifications**
- T−5 round reminder: one notification listing every Rx in the round by color and name.
- Follow-up ("Did Aga get her meds?"): three actions, §1.
- Notification permission denied: the app still works; the dose screen shows a quiet, dismissible note that reminders are off.

**System**
- Loading (first open, fetching from Supabase): skeleton of the dose screen, not a spinner.
- Offline: reads from cache; marking Given works and queues; a small indicator says it will sync.
- Sync conflict (two caregivers mark the same dose within seconds): first write wins; the second caregiver sees "already given by <name>" — never an error.
- Error (Supabase unreachable): plain language, retry, never lose a Given.
- Sign-in failed / cancelled: return to the sign-in screen with the reason.
- Success: marking Given is a small, satisfying confirmation on the round itself — not a toast, not a modal.

## 12. References
Two visual references. The reason matters more than the image — match or avoid the *attribute*, not the whole screen.

**MATCH — Cocoon (iOS)**
Mobbin: https://mobbin.com/apps/cocoon-ios-e8f9557a-5805-4376-9e0c-71da3daca043/6ccf200d-129b-41e4-8351-2be8a4650dca/screens
Local copies: `references/match.png` (the "Start a Cocoon" screen — the single best example) · `references/cocoon_sheet.jpg` (contact sheet of the first 24 screens) · full export in `design inspo/make it like this/` (71 screens).

Why: a pet on complex medication pulls at the owner's anxiety. The app should be **as calm as possible** — calm, soft, chill, generous white space. Specifically:
- Display type is playful and **serif**; body is quiet.
- Colors are pastel.
- Illustrations feel hand-made.
- Corners are rounded.
- If there is a background color it is a subtle, soft gradient that barely registers as a gradient.
- Body text is dark gray, not black. Border lines are soft gray with opacity, not solid.

One thing in Cocoon to NOT copy: subtitles set in all caps. Never use all-caps labels.

_Read from the screens, 2026-09-02 (the local files above are not in the repo; this is what they show):_
- The **row list** ("Welcome to Your Cocoon") is the model for a dose row. Each row: a pastel tint fill, a **small solid icon tile in the same hue** sitting on that tint, and label + chevron in the hue's dark step. That solid tile is where the Rx 500 step belongs — a chip, not a loose dot.
- Cocoon's row text runs light for its background. **Hold to the 700 step** for Rx names; a caregiver reads them at 3am.
- Only part of Cocoon is the voice worth matching: the pastel row list, the hand-made illustration, the serif wordmark, the barely-there gradient. Its **forms, buttons and section headers are stock iOS** — solid blue full-width buttons, gray system cards, all-caps labels. Do not take those.

**NEVER MATCH — Polestar (iOS)**
Mobbin: https://mobbin.com/apps/polestar-ios-07be2c37-2e4a-403b-af04-5567d2cac806/74afc19d-1e8f-48e6-9047-044da113edbc/screens
Local copies: `references/never-match.png` · `references/polestar_sheet.jpg` (contact sheet) · full export in `design inspo/don't make it like this/` (121 screens).

Why: hard corners, dark mode, stark, a brand color that feels like a warning, images cut off at the edges. Sleek, but no warmth. If a screen starts to feel like this, it's wrong even if it's clean.

_Read from the screens, 2026-09-02:_
- **The core failure is colour-as-status**: orange tiles mean unlocked / charging / locking, gray means inactive. This is exactly what §7 forbids for Rx colors, and it is the trap this product is closest to.
- **Two places we could land on Polestar by accident.** (1) The Overdue color treatment (§11, open): a saturated full-bleed panel would be Polestar's orange "Locking" status bar. If Overdue takes color, a tint and an icon — never a filled alarm panel. (2) The Given confirmation (§11): keep it inside the round, not a takeover strip.
- **Worth stealing, separate from the look:** Polestar's tile grid is glanceable — one big label, the state word directly beneath it, one icon. That information density is right; the execution is cold.

---

## Open conflicts to resolve before building
These are deliberately unresolved. Do not resolve them silently — ask Whitney.

**Resolved 2026-09-02 and moved to §8:** display font (League Spartan), Rx color saturation (100 surface / 500 mark / 700 text), background (white default, gradient optional on the dose screen), body text color (#404040), borders (`alpha-black-10`), and the first entry point for Skipped. The list below is what is left, plus what the answers opened up.

**Still open**

1. **Share-link default expiry** (§8, §10). Owner-editable; the default is unchosen.
2. **Vision/LLM provider for sheet-to-schedule** (§10). Isolate behind one function so it can be swapped.
3. **Where else Skipped can be set.** An Overdue round can be marked Skipped (§8). Whether a caregiver can also skip a round *ahead* of its due time — the "vet said hold tomorrow's dose" case — is undecided.
4. **Overdue color treatment, and the four state icons** (Given, Not given, Skipped, Overdue). Design-exploration items; default to icon only until proven insufficient.

**Opened by the 2026-09-02 answers**

5. **What time does a flattened Round land on?** "Flatten doses within an hour" needs an anchor. Proposed: a **rolling** window anchored on the **earliest** dose in the group — 8:00 and 8:45 both become 8:00, and a 9:30 dose starts a new Round. The alternative (clock-hour buckets) splits 8:55 and 9:05 into two Rounds, which is the case the rule exists to solve. Also unbounded: with a rolling window, 8:00 → 8:45 → 9:30 could chain into one Round spanning 90 minutes. Needs a cap.
6. **Is the 30-minute window symmetric?** Read as ±30 (markable from due−30, Overdue at due+30). If "30 min window" meant 30 minutes *after* due only, the early-marking rule needs its own answer.
7. **§12 now contradicts §5 on the display face.** §12 says display type is "playful and **serif**"; League Spartan is a geometric sans. The choice stands — §12's attribute line should be amended so the doc has one answer, not two.
8. **What can a partner with an account do?** Mark doses only, or also edit the course, invite guests, and end a course? This is the permission model, and it has to be settled before the schema.
9. **Guest name inheritance is a trade-off worth naming.** If Friday's sitter and a neighbour open the same link, every Given records the first name captured. Consistent with §8's "anyone holding the link can mark doses", but it means Given can name the wrong person. Confirm it is accepted, as §8 accepts the link trade-off.
