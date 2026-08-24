import { describe, expect, it } from "vitest";
import {
  buildSchedule,
  doseStatus,
  generateOccurrences,
  groupByDay,
  nextActionable,
} from "../schedule";
import type { Dose, Frequency, Medication, Pet } from "../types";

const NY = "America/New_York";

function med(overrides: Partial<Medication> & { frequency: Frequency }): Medication {
  return {
    id: "med-1",
    petId: "pet-1",
    name: "Test med",
    directions: null,
    startAt: "2026-03-01T13:00:00.000Z",
    endAt: null,
    colorId: "coral",
    archived: false,
    createdAt: "2026-03-01T00:00:00.000Z",
    ...overrides,
  };
}

const pet: Pet = {
  id: "pet-1",
  householdId: "hh-1",
  name: "Biscuit",
  species: "dog",
  createdAt: "2026-01-01T00:00:00.000Z",
};

function windowOf(from: string, to: string) {
  return { from: new Date(from), to: new Date(to), timeZone: NY };
}

describe("generateOccurrences — interval_hours", () => {
  it("steps from the start time", () => {
    const occurrences = generateOccurrences(
      med({ frequency: { kind: "interval_hours", hours: 8 } }),
      windowOf("2026-03-01T00:00:00Z", "2026-03-02T00:00:00Z"),
    );
    expect(occurrences.map((o) => o.scheduledFor)).toEqual([
      "2026-03-01T13:00:00.000Z",
      "2026-03-01T21:00:00.000Z",
    ]);
  });

  it("does not emit slots before the start time", () => {
    const occurrences = generateOccurrences(
      med({ frequency: { kind: "interval_hours", hours: 12 } }),
      windowOf("2026-02-01T00:00:00Z", "2026-03-01T14:00:00Z"),
    );
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].scheduledFor).toBe("2026-03-01T13:00:00.000Z");
  });

  it("skips ahead to the window instead of walking every past slot", () => {
    // Start a decade back; a naive loop would generate ~10k slots first.
    const occurrences = generateOccurrences(
      med({
        startAt: "2016-03-01T13:00:00.000Z",
        frequency: { kind: "interval_hours", hours: 8 },
      }),
      windowOf("2026-03-01T00:00:00Z", "2026-03-01T22:00:00Z"),
    );
    expect(occurrences.map((o) => o.scheduledFor)).toEqual([
      "2026-03-01T05:00:00.000Z",
      "2026-03-01T13:00:00.000Z",
      "2026-03-01T21:00:00.000Z",
    ]);
  });

  it("stops at endAt", () => {
    const occurrences = generateOccurrences(
      med({
        endAt: "2026-03-01T22:00:00.000Z",
        frequency: { kind: "interval_hours", hours: 8 },
      }),
      windowOf("2026-03-01T00:00:00Z", "2026-03-05T00:00:00Z"),
    );
    expect(occurrences).toHaveLength(2);
  });
});

describe("generateOccurrences — daily_at", () => {
  it("emits each listed time every day", () => {
    const occurrences = generateOccurrences(
      med({
        startAt: "2026-03-01T00:00:00.000Z",
        frequency: { kind: "daily_at", times: ["08:00", "20:00"] },
      }),
      windowOf("2026-03-01T00:00:00Z", "2026-03-03T00:00:00Z"),
    );
    // EST is UTC-5 here, so the 00:00Z start is Feb 28, 7:00 PM local — the
    // 8:00 PM dose that same evening is the first one due.
    expect(occurrences.map((o) => o.scheduledFor)).toEqual([
      "2026-03-01T01:00:00.000Z", // Feb 28, 8:00 PM
      "2026-03-01T13:00:00.000Z", // Mar 1, 8:00 AM
      "2026-03-02T01:00:00.000Z", // Mar 1, 8:00 PM
      "2026-03-02T13:00:00.000Z", // Mar 2, 8:00 AM
    ]);
  });

  it("holds the wall-clock time across a DST spring-forward", () => {
    // US DST begins 2026-03-08. 08:00 local is 13:00Z before, 12:00Z after.
    const occurrences = generateOccurrences(
      med({
        startAt: "2026-03-06T00:00:00.000Z",
        frequency: { kind: "daily_at", times: ["08:00"] },
      }),
      windowOf("2026-03-07T00:00:00Z", "2026-03-10T00:00:00Z"),
    );
    expect(occurrences.map((o) => o.scheduledFor)).toEqual([
      "2026-03-07T13:00:00.000Z",
      "2026-03-08T12:00:00.000Z",
      "2026-03-09T12:00:00.000Z",
    ]);
  });
});

describe("generateOccurrences — every_n_days and weekly_on", () => {
  it("counts the day interval from the start day", () => {
    const occurrences = generateOccurrences(
      med({
        startAt: "2026-03-02T14:00:00.000Z", // Mar 2 local
        frequency: { kind: "every_n_days", days: 3, times: ["09:00"] },
      }),
      windowOf("2026-03-01T00:00:00Z", "2026-03-12T00:00:00Z"),
    );
    // The start day is day 0 of the cycle, then every third day after.
    expect(occurrences.map((o) => o.scheduledFor)).toEqual([
      "2026-03-02T14:00:00.000Z",
      "2026-03-05T14:00:00.000Z",
      "2026-03-08T13:00:00.000Z", // DST began, still 09:00 local
      "2026-03-11T13:00:00.000Z",
    ]);
  });

  it("emits only the chosen weekdays", () => {
    const occurrences = generateOccurrences(
      med({
        startAt: "2026-03-01T00:00:00.000Z",
        frequency: { kind: "weekly_on", daysOfWeek: [1, 4], times: ["07:30"] },
      }),
      windowOf("2026-03-01T00:00:00Z", "2026-03-08T00:00:00Z"),
    );
    // Mar 2 is a Monday, Mar 5 a Thursday.
    expect(occurrences.map((o) => o.scheduledFor)).toEqual([
      "2026-03-02T12:30:00.000Z",
      "2026-03-05T12:30:00.000Z",
    ]);
  });

  it("never schedules an as-needed medication", () => {
    const occurrences = generateOccurrences(
      med({ frequency: { kind: "as_needed" } }),
      windowOf("2026-03-01T00:00:00Z", "2026-04-01T00:00:00Z"),
    );
    expect(occurrences).toEqual([]);
  });

  it("skips archived medications", () => {
    const occurrences = generateOccurrences(
      med({ archived: true, frequency: { kind: "interval_hours", hours: 6 } }),
      windowOf("2026-03-01T00:00:00Z", "2026-03-02T00:00:00Z"),
    );
    expect(occurrences).toEqual([]);
  });
});

describe("doseStatus", () => {
  const at = "2026-03-01T13:00:00.000Z";
  const dose: Dose = {
    id: "d1",
    medicationId: "med-1",
    scheduledFor: at,
    givenAt: at,
    givenBy: "u1",
    givenByName: "Sam",
    notes: null,
  };

  it("reports given regardless of time", () => {
    expect(doseStatus(at, dose, new Date("2026-03-09T00:00:00Z"))).toBe("given");
  });

  it("reports upcoming, due, then overdue", () => {
    expect(doseStatus(at, null, new Date("2026-03-01T10:00:00Z"))).toBe("upcoming");
    expect(doseStatus(at, null, new Date("2026-03-01T12:45:00Z"))).toBe("due");
    expect(doseStatus(at, null, new Date("2026-03-01T13:10:00Z"))).toBe("due");
    expect(doseStatus(at, null, new Date("2026-03-01T13:30:00Z"))).toBe("overdue");
  });
});

describe("buildSchedule", () => {
  const medications = [
    med({
      id: "med-1",
      name: "Rimadyl",
      frequency: { kind: "interval_hours", hours: 12 },
    }),
    med({
      id: "med-2",
      name: "Apoquel",
      startAt: "2026-03-01T00:00:00.000Z",
      frequency: { kind: "daily_at", times: ["09:00"] },
    }),
  ];

  it("merges medications, sorts by time, and attaches doses", () => {
    const doses: Dose[] = [
      {
        id: "d1",
        medicationId: "med-2",
        scheduledFor: "2026-03-01T14:00:00.000Z",
        givenAt: "2026-03-01T14:05:00.000Z",
        givenBy: "u1",
        givenByName: "Sam",
        notes: null,
      },
    ];
    const entries = buildSchedule({
      medications,
      pets: [pet],
      doses,
      window: windowOf("2026-03-01T00:00:00Z", "2026-03-02T00:00:00Z"),
      now: new Date("2026-03-01T15:00:00Z"),
    });

    expect(entries.map((e) => [e.medication.name, e.scheduledFor, e.status])).toEqual([
      ["Rimadyl", "2026-03-01T13:00:00.000Z", "overdue"],
      ["Apoquel", "2026-03-01T14:00:00.000Z", "given"],
    ]);
    expect(entries[1].dose?.givenByName).toBe("Sam");
  });

  it("matches doses whose timestamps differ only in ISO formatting", () => {
    const doses: Dose[] = [
      {
        id: "d1",
        medicationId: "med-1",
        scheduledFor: "2026-03-01T13:00:00+00:00",
        givenAt: "2026-03-01T13:02:00.000Z",
        givenBy: "u1",
        givenByName: "Sam",
        notes: null,
      },
    ];
    const entries = buildSchedule({
      medications: [medications[0]],
      pets: [pet],
      doses,
      window: windowOf("2026-03-01T00:00:00Z", "2026-03-01T18:00:00Z"),
      now: new Date("2026-03-01T15:00:00Z"),
    });
    expect(entries[0].status).toBe("given");
  });

  it("drops medications whose pet is not in view", () => {
    const entries = buildSchedule({
      medications,
      pets: [],
      doses: [],
      window: windowOf("2026-03-01T00:00:00Z", "2026-03-02T00:00:00Z"),
      now: new Date("2026-03-01T15:00:00Z"),
    });
    expect(entries).toEqual([]);
  });
});

describe("nextActionable", () => {
  const base = {
    medications: [med({ frequency: { kind: "interval_hours", hours: 12 } })],
    pets: [pet],
    doses: [],
    window: windowOf("2026-03-01T00:00:00Z", "2026-03-03T00:00:00Z"),
  };

  it("prefers the most recent overdue dose over an upcoming one", () => {
    const entries = buildSchedule({ ...base, now: new Date("2026-03-02T05:00:00Z") });
    const next = nextActionable(entries);
    expect(next?.scheduledFor).toBe("2026-03-02T01:00:00.000Z");
    expect(next?.status).toBe("overdue");
  });

  it("falls to the soonest upcoming dose when nothing is overdue", () => {
    const entries = buildSchedule({ ...base, now: new Date("2026-03-01T06:00:00Z") });
    expect(nextActionable(entries)?.scheduledFor).toBe("2026-03-01T13:00:00.000Z");
  });

  it("returns null when everything is given", () => {
    const entries = buildSchedule({ ...base, now: new Date("2026-03-01T06:00:00Z") }).map(
      (entry) => ({ ...entry, status: "given" as const }),
    );
    expect(nextActionable(entries)).toBeNull();
  });
});

describe("groupByDay", () => {
  it("buckets entries by local calendar day", () => {
    const entries = buildSchedule({
      medications: [med({ frequency: { kind: "interval_hours", hours: 12 } })],
      pets: [pet],
      doses: [],
      window: windowOf("2026-03-01T00:00:00Z", "2026-03-03T00:00:00Z"),
      now: new Date("2026-03-01T06:00:00Z"),
    });
    const groups = groupByDay(entries, NY);
    // Mar 1 13:00Z and Mar 2 01:00Z read as 8:00 AM and 8:00 PM on Mar 1
    // locally, so the three slots collapse into two local days.
    expect(groups).toHaveLength(2);
    expect(groups[0].entries).toHaveLength(2);
    expect(groups[1].entries).toHaveLength(1);
  });
});
