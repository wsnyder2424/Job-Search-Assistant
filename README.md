# Dosely — pet medication tracker

A multi-user app for tracking your pets' medications. Add a medication by
typing it in or by photographing the label; the home screen is a schedule that
counts down to the next dose, color-codes every medication, and records who
checked each one off.

Built as a mobile-first web app, with the domain logic kept in a
platform-agnostic module so a React Native client can reuse it unchanged.

---

## What it does

**Onboarding** — create a household, add a pet, then add its first medication
either by typing the details or by taking a photo of the label. A photo is sent
to Claude, which reads back the name, directions and dosing frequency into the
form for you to check before saving. Every medication is assigned a color, and
the picker fades out colors another medication already uses.

**Home schedule** — the next dose due is shown as a hero card with a live
countdown ("in 2h 15m", or "2h overdue" in red once it is late). Below it, the
day's doses are listed in order, each with its medication's color bar and a
checkbox. Checking the box records the dose against you, and everyone else in
the household immediately sees "Given by Sam at 8:04 AM" — which is what stops
a pet being double-dosed by two caregivers.

**Households** — each person has their own account, and a household is shared.
Tap *Invite* to mint a one-time code; whoever enters it joins and sees the same
pets, medications and schedule.

---

## Setup

### 1. Install

```bash
npm install
```

### 2. Create a Supabase project

At [supabase.com](https://supabase.com), then open the SQL editor and run the
contents of [`supabase/schema.sql`](supabase/schema.sql). That creates the
tables, the row-level security policies, and the invite functions.

### 3. Configure the environment

```bash
cp .env.example .env.local
```

Fill in from **Project Settings → API**:

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase anon key |
| `ANTHROPIC_API_KEY` | no | Reads medication labels from photos |

Without `ANTHROPIC_API_KEY` the app still runs — the camera button reports that
photo reading is unavailable and you type the medication in instead.

### 4. Run

```bash
npm run dev
```

Then open <http://localhost:3000>. Running without Supabase credentials shows a
setup screen rather than an error.

---

## Architecture

```
src/
  core/          Platform-agnostic domain logic — no React, DOM or Node APIs.
    types.ts       Medication, Pet, Dose, Frequency, ScheduleEntry
    time.ts        Timezone-aware wall-clock helpers (Intl-based, DST-correct)
    frequency.ts   Frequency model, plain-language summaries, label parsing
    schedule.ts    Expands frequencies into dose slots; the schedule engine
    colors.ts      Medication palette and assignment
    countdown.ts   "in 2h 15m" / "12m overdue" formatting
  data/          Row mapping, server queries, server actions
  lib/supabase/  Browser, server and proxy clients
  components/    Shared UI (medication form, dose row, pickers)
  app/           Routes: /login, /onboarding, /home, /home/add
supabase/
  schema.sql     Tables, RLS policies, invite functions
  tests/         Applies the schema to a real Postgres and asserts isolation
```

### Why `src/core` is separate

Everything in `src/core` is pure TypeScript with no platform imports. The
schedule engine, frequency model, color assignment and countdown formatting are
the parts a native client would otherwise have to reimplement (and get subtly
wrong). A React Native app can import this directory as-is and only needs to
supply a different transport for `src/data`.

### Dose slots are derived, not stored

Only doses that were actually **given** exist as rows. The slots themselves are
computed from each medication's frequency at read time, keyed by
`medicationId|scheduledForISO`. This means:

- editing a frequency reshapes the future schedule with no backfill or cleanup;
- a medication started a decade ago costs nothing to display (the engine jumps
  straight to the requested window rather than walking every past dose);
- a unique index on `(medication_id, scheduled_for)` makes a dose idempotent,
  so two caregivers tapping the same checkbox at once log it once, not twice.

### Timezones

Dose times are wall-clock times: "8:00 AM every day" must stay 8:00 AM through
a daylight-saving change. `src/core/time.ts` resolves wall-clock ↔ instant
using `Intl`, and the schedule tests cover a DST spring-forward explicitly.

---

## Testing

```bash
npm test          # domain logic — schedule, frequency, colors, countdown
npm run typecheck
npm run build
```

The database rules have their own suite, which applies `schema.sql` to a real
Postgres and asserts that the household boundary actually holds — that an
unrelated user cannot read another household's pets, medications or dose log,
cannot write to them, and cannot add themselves to a household:

```bash
# against any Postgres 14+ instance
PGHOST=localhost PGPORT=5432 PGUSER=postgres ./supabase/tests/run.sh
```

---

## Security model

Access is decided entirely in the database, so a bug in the client cannot leak
another household's data.

- Every table has row-level security enabled.
- Policies resolve membership through `SECURITY DEFINER` helper functions,
  which is what keeps the policy on `household_members` from recursing into
  itself.
- `household_members` has **no** insert policy. Membership is granted only by
  the household-creation trigger or by `accept_household_invite()`, so a client
  cannot add itself to a household by inserting a row.
- Doses can only be inserted with `given_by = auth.uid()`, so a dose cannot be
  attributed to someone else.
- Invite codes are single-use, expire after 7 days, and omit characters that
  are ambiguous when read aloud.

---

## Notes and limitations

- **Reminders are not push notifications.** The schedule counts down while the
  app is open. Real reminders need either a native client (local
  notifications) or web push with a service worker and a scheduled sender —
  worth doing before this is relied on for a critical medication.
- **Label reading is an assist, not a source of truth.** Extracted fields are
  always shown for review before saving, and the model is instructed to return
  null rather than guess. Confirm against the label.
- **Frequency covers the common vet cases**: every N hours, N times daily at
  set times, every N days (including monthly), specific weekdays, and as
  needed. Tapering schedules are not modelled.
