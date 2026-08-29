import { describe, expect, it } from "vitest";
import {
  describeFrequency,
  parseFrequencyPhrase,
  spreadAcrossDay,
  validateFrequency,
} from "../frequency";

describe("parseFrequencyPhrase", () => {
  it("reads hour intervals off label directions", () => {
    expect(parseFrequencyPhrase("Give 1 tablet by mouth every 8 hours")).toEqual({
      kind: "interval_hours",
      hours: 8,
    });
    expect(parseFrequencyPhrase("1 capsule q12h with food")).toEqual({
      kind: "interval_hours",
      hours: 12,
    });
  });

  it("takes the shorter end of a range so a dose is never missed", () => {
    expect(parseFrequencyPhrase("every 6-8 hours as directed")).toEqual({
      kind: "interval_hours",
      hours: 6,
    });
  });

  it("reads per-day phrasings, including vet shorthand", () => {
    expect(parseFrequencyPhrase("twice daily", "08:00")).toEqual({
      kind: "daily_at",
      times: ["08:00", "20:00"],
    });
    expect(parseFrequencyPhrase("give BID", "07:00")).toEqual({
      kind: "daily_at",
      times: ["07:00", "19:00"],
    });
    expect(parseFrequencyPhrase("3 times a day", "06:00")).toEqual({
      kind: "daily_at",
      times: ["06:00", "14:00", "22:00"],
    });
  });

  it("reads day and month intervals", () => {
    expect(parseFrequencyPhrase("every other day", "09:00")).toEqual({
      kind: "every_n_days",
      days: 2,
      times: ["09:00"],
    });
    expect(parseFrequencyPhrase("Apply once a month", "09:00")).toEqual({
      kind: "every_n_days",
      days: 30,
      times: ["09:00"],
    });
  });

  it("recognizes as-needed dosing", () => {
    expect(parseFrequencyPhrase("1 tablet as needed for pain")).toEqual({
      kind: "as_needed",
    });
    expect(parseFrequencyPhrase("PRN")).toEqual({ kind: "as_needed" });
  });

  it("falls back to once daily for a bare daily instruction", () => {
    expect(parseFrequencyPhrase("Give once daily with food", "08:00")).toEqual({
      kind: "daily_at",
      times: ["08:00"],
    });
  });

  it("returns null rather than guessing when nothing matches", () => {
    expect(parseFrequencyPhrase("keep refrigerated")).toBeNull();
    expect(parseFrequencyPhrase("")).toBeNull();
  });
});

describe("spreadAcrossDay", () => {
  it("spaces doses evenly and wraps past midnight", () => {
    expect(spreadAcrossDay("08:00", 1)).toEqual(["08:00"]);
    expect(spreadAcrossDay("08:00", 2)).toEqual(["08:00", "20:00"]);
    expect(spreadAcrossDay("22:00", 2)).toEqual(["10:00", "22:00"]);
    expect(spreadAcrossDay("08:00", 4)).toEqual(["02:00", "08:00", "14:00", "20:00"]);
  });
});

describe("describeFrequency", () => {
  it("summarizes each frequency kind in plain language", () => {
    expect(describeFrequency({ kind: "interval_hours", hours: 8 })).toBe("Every 8 hours");
    expect(describeFrequency({ kind: "interval_hours", hours: 24 })).toBe("Once daily");
    expect(describeFrequency({ kind: "daily_at", times: ["08:00", "20:00"] })).toBe(
      "Twice daily at 8:00 AM and 8:00 PM",
    );
    expect(
      describeFrequency({ kind: "every_n_days", days: 30, times: ["09:00"] }),
    ).toBe("Every 30 days at 9:00 AM");
    expect(
      describeFrequency({ kind: "weekly_on", daysOfWeek: [1, 4], times: ["07:30"] }),
    ).toBe("Monday, Thursday at 7:30 AM");
    expect(describeFrequency({ kind: "as_needed" })).toBe("As needed");
  });
});

describe("validateFrequency", () => {
  it("accepts well-formed frequencies", () => {
    expect(validateFrequency({ kind: "interval_hours", hours: 8 })).toBeNull();
    expect(validateFrequency({ kind: "daily_at", times: ["08:00"] })).toBeNull();
    expect(validateFrequency({ kind: "as_needed" })).toBeNull();
  });

  it("rejects intervals that would never fire or would flood the schedule", () => {
    expect(validateFrequency({ kind: "interval_hours", hours: 0 })).toMatch(/positive/);
    expect(validateFrequency({ kind: "interval_hours", hours: -3 })).toMatch(/positive/);
  });

  it("rejects malformed and empty times", () => {
    expect(validateFrequency({ kind: "daily_at", times: [] })).toMatch(/at least one/);
    expect(validateFrequency({ kind: "daily_at", times: ["25:00"] })).toMatch(/not a valid/);
    expect(validateFrequency({ kind: "daily_at", times: ["8am"] })).toMatch(/not a valid/);
  });

  it("rejects a zero-day cycle and an empty weekday set", () => {
    expect(
      validateFrequency({ kind: "every_n_days", days: 0, times: ["09:00"] }),
    ).toMatch(/whole number/);
    expect(
      validateFrequency({ kind: "weekly_on", daysOfWeek: [], times: ["09:00"] }),
    ).toMatch(/day of the week/);
  });
});
