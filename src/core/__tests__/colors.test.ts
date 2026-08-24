import { describe, expect, it } from "vitest";
import { MEDICATION_COLORS, assignColor, getColor } from "../colors";

describe("assignColor", () => {
  it("gives the first medication the first color", () => {
    expect(assignColor([])).toBe(MEDICATION_COLORS[0].id);
  });

  it("never reuses a color while unused ones remain", () => {
    const taken: string[] = [];
    for (let i = 0; i < MEDICATION_COLORS.length; i += 1) {
      const next = assignColor(taken, `Med ${i}`);
      expect(taken).not.toContain(next);
      taken.push(next);
    }
    expect(new Set(taken).size).toBe(MEDICATION_COLORS.length);
  });

  it("falls back deterministically once the palette is exhausted", () => {
    const all = MEDICATION_COLORS.map((c) => c.id);
    const first = assignColor(all, "Rimadyl");
    expect(assignColor(all, "Rimadyl")).toBe(first);
    expect(all).toContain(first);
  });

  it("ignores unknown taken colors rather than skipping the palette", () => {
    expect(assignColor(["not-a-color"])).toBe(MEDICATION_COLORS[0].id);
  });
});

describe("getColor", () => {
  it("resolves known ids and falls back for unknown ones", () => {
    expect(getColor("teal").name).toBe("Teal");
    expect(getColor("nonsense")).toBe(MEDICATION_COLORS[0]);
    expect(getColor(null)).toBe(MEDICATION_COLORS[0]);
  });

  it("keeps every palette entry visually distinct", () => {
    const hexes = MEDICATION_COLORS.map((c) => c.hex);
    expect(new Set(hexes).size).toBe(hexes.length);
  });
});
