"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  buildSchedule,
  deviceTimeZone,
  formatCountdown,
  fromDayNumber,
  getColor,
  groupByDay,
  nextActionable,
  toDayNumber,
  toWallClock,
  type Dose,
  type Medication,
  type Pet,
  type ScheduleEntry,
} from "@/core";
import { markDoseGiven, undoDose } from "@/data/actions";
import DoseRow from "@/components/DoseRow";
import InviteSheet from "@/components/InviteSheet";

interface Props {
  householdId: string;
  householdName: string;
  pets: Pet[];
  medications: Medication[];
  doses: Dose[];
  memberCount: number;
  currentUserId: string;
  windowFrom: string;
  windowTo: string;
}

/** The countdown only needs minute resolution; tick a little faster so the
 *  final minute does not feel stuck. */
const TICK_MS = 15_000;

export default function ScheduleView({
  householdId,
  householdName,
  pets,
  medications,
  doses,
  memberCount,
  currentUserId,
  windowFrom,
  windowTo,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [now, setNow] = useState(() => new Date());
  const [showInvite, setShowInvite] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [showWholeWeek, setShowWholeWeek] = useState(false);

  /**
   * Check-offs applied locally before the server round-trip, so the checkbox
   * responds instantly. Keyed by occurrence key; `null` means "undone".
   */
  const [pending, setPending] = useState<Record<string, Dose | null>>({});

  const timeZone = useMemo(() => deviceTimeZone(), []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const entries = useMemo(() => {
    const merged = [...doses];
    for (const [key, dose] of Object.entries(pending)) {
      const [medicationId, scheduledFor] = key.split("|");
      const index = merged.findIndex(
        (candidate) =>
          candidate.medicationId === medicationId &&
          new Date(candidate.scheduledFor).toISOString() === scheduledFor,
      );
      if (dose) {
        if (index === -1) merged.push(dose);
      } else if (index !== -1) {
        merged.splice(index, 1);
      }
    }

    return buildSchedule({
      medications,
      pets,
      doses: merged,
      window: { from: new Date(windowFrom), to: new Date(windowTo), timeZone },
      now,
    });
  }, [doses, pending, medications, pets, windowFrom, windowTo, timeZone, now]);

  const visibleEntries = useMemo(
    () =>
      selectedPetId ? entries.filter((entry) => entry.pet.id === selectedPetId) : entries,
    [entries, selectedPetId],
  );

  const next = useMemo(() => nextActionable(visibleEntries), [visibleEntries]);

  const toggleDose = useCallback(
    (entry: ScheduleEntry, given: boolean) => {
      const key = entry.key;

      setPending((current) => ({
        ...current,
        [key]: given
          ? {
              id: `pending-${key}`,
              medicationId: entry.medicationId,
              scheduledFor: entry.scheduledFor,
              givenAt: new Date().toISOString(),
              givenBy: currentUserId,
              givenByName: "You",
              notes: null,
            }
          : null,
      }));

      startTransition(async () => {
        const result = given
          ? await markDoseGiven({
              medicationId: entry.medicationId,
              scheduledFor: entry.scheduledFor,
            })
          : await undoDose({
              medicationId: entry.medicationId,
              scheduledFor: entry.scheduledFor,
            });

        if (!result.ok) {
          // Roll the optimistic change back so the UI never claims a dose was
          // logged when it was not.
          setPending((current) => {
            const rest = { ...current };
            delete rest[key];
            return rest;
          });
        }
        router.refresh();
      });
    },
    [currentUserId, router],
  );

  // Server data has caught up; drop the local overrides it now covers.
  useEffect(() => {
    setPending({});
  }, [doses]);

  const groups = useMemo(
    () => groupByDay(visibleEntries, timeZone),
    [visibleEntries, timeZone],
  );
  const todayNumber = toDayNumber(toWallClock(now, timeZone));

  /**
   * The point of this screen is what to give next, so it defaults to anything
   * still outstanding plus today and tomorrow. A week of future doses is
   * useful to check, but not at the cost of burying the next one.
   */
  const nearGroups = useMemo(
    () => groups.filter((group) => group.dayNumber <= todayNumber + 1),
    [groups, todayNumber],
  );
  const laterGroups = useMemo(
    () => groups.filter((group) => group.dayNumber > todayNumber + 1),
    [groups, todayNumber],
  );
  const laterDoseCount = useMemo(
    () => laterGroups.reduce((total, group) => total + group.entries.length, 0),
    [laterGroups],
  );
  const shownGroups = showWholeWeek ? groups : nearGroups;

  return (
    <div className="min-h-dvh pb-28">
      <header className="sticky top-0 z-10 border-b border-[var(--color-line)] bg-[var(--color-canvas)]/95 px-5 pt-5 pb-3 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight">{householdName}</h1>
            <p className="text-sm text-[var(--color-ink-soft)]">
              {memberCount === 1
                ? "Just you so far"
                : `${memberCount} people caring for ${pets.length === 1 ? pets[0]?.name ?? "your pet" : "your pets"}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowInvite(true)}
            className="shrink-0 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2 text-sm font-medium"
          >
            Invite
          </button>
        </div>

        {pets.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <PetChip
              label="All pets"
              active={selectedPetId === null}
              onClick={() => setSelectedPetId(null)}
            />
            {pets.map((pet) => (
              <PetChip
                key={pet.id}
                label={pet.name}
                active={selectedPetId === pet.id}
                onClick={() => setSelectedPetId(pet.id)}
              />
            ))}
          </div>
        )}
      </header>

      <main className="px-5">
        {next ? (
          <NextUpCard entry={next} now={now} onGive={() => toggleDose(next, true)} />
        ) : (
          <EmptyNextUp hasMedications={medications.length > 0} />
        )}

        {shownGroups.map((group) => (
          <section key={group.dayNumber} className="mt-6">
            <h2 className="mb-2 px-1 text-sm font-semibold text-[var(--color-ink-soft)]">
              {dayHeading(group.dayNumber, todayNumber)}
            </h2>
            <div className="card divide-y divide-[var(--color-line)] overflow-hidden">
              {group.entries.map((entry) => (
                <DoseRow
                  key={entry.key}
                  entry={entry}
                  now={now}
                  timeZone={timeZone}
                  onToggle={(given) => toggleDose(entry, given)}
                />
              ))}
            </div>
          </section>
        ))}

        {laterDoseCount > 0 && (
          <button
            type="button"
            onClick={() => setShowWholeWeek((current) => !current)}
            className="mt-5 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 text-sm font-medium text-[var(--color-ink-soft)]"
          >
            {showWholeWeek
              ? "Show less"
              : `Show the rest of the week (${laterDoseCount} more)`}
          </button>
        )}

        {medications.length === 0 && (
          <p className="mt-8 text-center text-[var(--color-ink-soft)]">
            No medications yet.
          </p>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-[var(--color-line)] bg-[var(--color-surface)]/95 px-5 py-3 backdrop-blur">
        <Link href="/home/add" className="btn-primary block text-center">
          Add a medication
        </Link>
      </div>

      {showInvite && (
        <InviteSheet householdId={householdId} onClose={() => setShowInvite(false)} />
      )}
    </div>
  );
}

function PetChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
        active
          ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
          : "border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink-soft)]"
      }`}
    >
      {label}
    </button>
  );
}

/** The hero card: what to give next, how long until it is due, one tap to log. */
function NextUpCard({
  entry,
  now,
  onGive,
}: {
  entry: ScheduleEntry;
  now: Date;
  onGive: () => void;
}) {
  const color = getColor(entry.medication.colorId);
  const overdue = entry.status === "overdue";
  const scheduledMs = new Date(entry.scheduledFor).getTime();

  return (
    <section
      className="card mt-4 overflow-hidden"
      style={{ backgroundColor: color.softHex, borderColor: color.hex }}
      aria-label="Next dose due"
    >
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: color.hex }}>
          {overdue ? "Overdue" : "Next up"}
        </p>

        <p className="mt-1 text-2xl font-bold tracking-tight text-[var(--color-ink)]">
          {entry.medication.name}
        </p>
        <p className="text-[var(--color-ink-soft)]">
          for {entry.pet.name}
          {entry.medication.directions ? ` · ${entry.medication.directions}` : ""}
        </p>

        <p
          className="tabular mt-4 text-4xl font-bold tracking-tight"
          style={{ color: color.hex }}
          aria-live="polite"
        >
          {formatCountdown(scheduledMs, now.getTime())}
        </p>

        <button
          type="button"
          onClick={onGive}
          className="mt-4 w-full rounded-xl px-4 py-3.5 font-semibold transition active:scale-[0.99]"
          style={{ backgroundColor: color.hex, color: color.onHex }}
        >
          Mark as given
        </button>
      </div>
    </section>
  );
}

function EmptyNextUp({ hasMedications }: { hasMedications: boolean }) {
  return (
    <section className="card mt-4 p-6 text-center">
      <p className="text-3xl" aria-hidden>
        {hasMedications ? "✅" : "🐾"}
      </p>
      <p className="mt-2 font-semibold">
        {hasMedications ? "All caught up" : "Nothing scheduled yet"}
      </p>
      <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
        {hasMedications
          ? "Every dose in the next week is checked off."
          : "Add a medication to start the schedule."}
      </p>
    </section>
  );
}

function dayHeading(dayNumber: number, todayNumber: number): string {
  if (dayNumber === todayNumber) return "Today";
  if (dayNumber === todayNumber + 1) return "Tomorrow";
  if (dayNumber === todayNumber - 1) return "Yesterday";

  const { year, month, day } = fromDayNumber(dayNumber);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
