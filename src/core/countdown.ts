/**
 * Countdown formatting for the home screen. Pure string math so the same
 * labels render on web and native.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * "in 2h 15m" / "12m overdue" / "now". `nowMs` is passed in rather than read
 * from the clock so this stays deterministic and testable.
 */
export function formatCountdown(scheduledForMs: number, nowMs: number): string {
  const deltaMs = scheduledForMs - nowMs;
  const magnitude = Math.abs(deltaMs);

  if (magnitude < MINUTE) return "now";

  const parts = splitDuration(magnitude);
  return deltaMs > 0 ? `in ${parts}` : `${parts} overdue`;
}

/** Bare duration without direction, e.g. "2h 15m". */
export function formatDuration(ms: number): string {
  return Math.abs(ms) < MINUTE ? "under a minute" : splitDuration(Math.abs(ms));
}

function splitDuration(ms: number): string {
  if (ms >= DAY) {
    const days = Math.floor(ms / DAY);
    const hours = Math.floor((ms % DAY) / HOUR);
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
  if (ms >= HOUR) {
    const hours = Math.floor(ms / HOUR);
    const minutes = Math.floor((ms % HOUR) / MINUTE);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${Math.floor(ms / MINUTE)}m`;
}

/**
 * How long to wait before the countdown label would change — lets the UI tick
 * once a minute (or once a second in the final minute) instead of on a timer
 * that fires needlessly.
 */
export function msUntilCountdownChanges(
  scheduledForMs: number,
  nowMs: number,
): number {
  const magnitude = Math.abs(scheduledForMs - nowMs);
  if (magnitude < MINUTE) return Math.max(1_000, MINUTE - magnitude);
  return MINUTE - ((nowMs % MINUTE) || 0);
}
