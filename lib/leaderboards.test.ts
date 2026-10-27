import { describe, expect, it } from "vitest";
import { currentStreak, rankScores } from "./leaderboards";

describe("leaderboard ranking", () => {
  it("uses lower average, then participation, then name", () => {
    const rows = rankScores([
      { userId: "a", displayName: "Zed", scores: [1, 2] },
      { userId: "b", displayName: "Bea", scores: [1.5] },
      { userId: "c", displayName: "Amy", scores: [1.5] },
      { userId: "d", displayName: "No score", scores: [] },
    ]);
    expect(rows.map((row) => row.userId)).toEqual(["a", "c", "b"]);
    expect(rows.map((row) => row.rank)).toEqual([1, 2, 3]);
  });
});

describe("current streak", () => {
  it("allows today to remain unplayed", () => {
    expect(currentStreak(["2026-10-24", "2026-10-25", "2026-10-26"], "2026-10-27")).toBe(3);
  });
  it("starts from today when played", () => {
    expect(currentStreak(["2026-10-25", "2026-10-26", "2026-10-27"], "2026-10-27")).toBe(3);
  });
  it("returns zero after a gap", () => {
    expect(currentStreak(["2026-10-24"], "2026-10-27")).toBe(0);
  });
});
