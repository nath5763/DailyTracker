import { describe, expect, it } from "vitest";
import { formatScore } from "./format";

describe("score formatting", () => {
  it("formats backend numeric values consistently", () => {
    expect(formatScore(1.3)).toBe("1.30×");
    expect(formatScore(null)).toBe("—");
  });

  it("uses game-provided score presentation", () => {
    const points = { prefix: "", suffix: " pts", minimumDecimalPlaces: 0, maximumDecimalPlaces: 2 };
    expect(formatScore(180, points)).toBe("180 pts");
    expect(formatScore(182.5, points)).toBe("182.5 pts");
  });
});
