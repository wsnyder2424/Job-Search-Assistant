"use client";

import {
  formatCountdown,
  formatTimeOfDayLabel,
  formatTimeOfDay,
  getColor,
  toWallClock,
  type ScheduleEntry,
} from "@/core";

interface Props {
  entry: ScheduleEntry;
  now: Date;
  timeZone: string;
  onToggle: (given: boolean) => void;
}

/**
 * One slot on the schedule. The checkbox is the whole point of the row, so it
 * is a real checkbox input wrapped in a label — the entire row is the tap
 * target, and screen readers announce it as checked/unchecked.
 */
export default function DoseRow({ entry, now, timeZone, onToggle }: Props) {
  const color = getColor(entry.medication.colorId);
  const given = entry.status === "given";
  const overdue = entry.status === "overdue";
  const due = entry.status === "due";

  const scheduled = new Date(entry.scheduledFor);
  const wall = toWallClock(scheduled, timeZone);
  const timeLabel = formatTimeOfDayLabel(formatTimeOfDay(wall.hour, wall.minute));

  return (
    <label
      className={`flex cursor-pointer items-center gap-3.5 px-4 py-3.5 transition ${
        given ? "bg-[var(--color-bg-secondary)]" : ""
      }`}
    >
      {/* Color bar — the at-a-glance identity of the medication. */}
      <span
        aria-hidden
        className="h-10 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color.hex, opacity: given ? 0.4 : 1 }}
      />

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span
            className={`truncate font-semibold ${
              given ? "text-[var(--color-fg-quaternary)] line-through" : "text-[var(--color-text-primary)]"
            }`}
          >
            {entry.medication.name}
          </span>
          <span className="tabular shrink-0 text-sm text-[var(--color-text-tertiary)]">
            {timeLabel}
          </span>
        </span>

        <span className="mt-0.5 block truncate text-sm text-[var(--color-text-tertiary)]">
          {given ? givenCaption(entry) : subtitle(entry, now, overdue, due)}
        </span>
      </span>

      {/*
        The design system's checkbox, left in the brand color. Tinting it with
        the medication color was tempting — but a checked box in the red or
        amber end of the palette reads as an error rather than as "done", and
        the accent bar beside it already carries the medication's identity.
      */}
      <input
        type="checkbox"
        checked={given}
        onChange={(event) => onToggle(event.target.checked)}
        aria-label={`Mark ${entry.medication.name} for ${entry.pet.name} at ${timeLabel} as given`}
        className="checkbox"
      />
    </label>
  );
}

function subtitle(
  entry: ScheduleEntry,
  now: Date,
  overdue: boolean,
  due: boolean,
): string {
  const countdown = formatCountdown(new Date(entry.scheduledFor).getTime(), now.getTime());
  const prefix = overdue ? countdown : due ? `Due ${countdown}` : countdown;
  return `${entry.pet.name} · ${prefix}`;
}

function givenCaption(entry: ScheduleEntry): string {
  const who = entry.dose?.givenByName ?? "someone";
  if (!entry.dose) return `${entry.pet.name} · given`;

  const givenAt = new Date(entry.dose.givenAt);
  const time = givenAt.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `Given by ${who} at ${time}`;
}
