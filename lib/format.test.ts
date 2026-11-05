import { describe, expect, it } from "vitest";
import { formatRankingScore, formatScore } from "./format";

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

it("prefers a game-specific leaderboard display score", () => {
  const game = { id: "q", slug: "quordle", name: "Quordle", sourceUrl: "", rankingDirection: "lower" as const,
    scoreFormat: { prefix: "", suffix: "", minimumDecimalPlaces: 0, maximumDecimalPlaces: 0 },
    submission: { exampleShareText: "", puzzleLabel: "", scoreLabel: "", scoreMin: 0, scoreMax: null, scoreStep: 1, editableFields: [] },
    manualEntry: { supported: false, puzzleIdRequired: false, completionStatuses: [], fields: [] } };
  expect(formatRankingScore({ rank: 1, userId: "u", shareId: "s", displayName: "P", average: 1,
    gamesPlayed: 1, displayScore: "3/4 · 32" }, game)).toBe("3/4 · 32");
});
