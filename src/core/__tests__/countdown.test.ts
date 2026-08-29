import { describe, expect, it } from "vitest";
import { formatCountdown, formatDuration } from "../countdown";

const NOW = new Date("2026-03-01T12:00:00Z").getTime();
const minutes = (n: number) => n * 60_000;

describe("formatCountdown", () => {
  it("counts down to an upcoming dose", () => {
    expect(formatCountdown(NOW + minutes(5), NOW)).toBe("in 5m");
    expect(formatCountdown(NOW + minutes(135), NOW)).toBe("in 2h 15m");
    expect(formatCountdown(NOW + minutes(120), NOW)).toBe("in 2h");
    expect(formatCountdown(NOW + minutes(60 * 26), NOW)).toBe("in 1d 2h");
  });

  it("counts up once a dose is late", () => {
    expect(formatCountdown(NOW - minutes(12), NOW)).toBe("12m overdue");
    expect(formatCountdown(NOW - minutes(90), NOW)).toBe("1h 30m overdue");
  });

  it("reads 'now' inside the final minute, in either direction", () => {
    expect(formatCountdown(NOW, NOW)).toBe("now");
    expect(formatCountdown(NOW + 30_000, NOW)).toBe("now");
    expect(formatCountdown(NOW - 30_000, NOW)).toBe("now");
  });
});

describe("formatDuration", () => {
  it("formats a bare duration without direction", () => {
    expect(formatDuration(minutes(135))).toBe("2h 15m");
    expect(formatDuration(-minutes(135))).toBe("2h 15m");
    expect(formatDuration(20_000)).toBe("under a minute");
  });
});
