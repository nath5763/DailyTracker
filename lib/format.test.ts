import { describe, expect, it } from "vitest";
import { formatNumber, formatNumericDisplay, formatRankingScore, formatResultDetails, formatScore } from "./format";

describe("score formatting", () => {
  it("formats backend numeric values consistently", () => {
    expect(formatScore(1.3)).toBe("1.3×");
    expect(formatScore(null)).toBe("—");
  });

  it("uses game-provided score presentation", () => {
    const points = { prefix: "", suffix: " pts", minimumDecimalPlaces: 0, maximumDecimalPlaces: 2 };
    expect(formatScore(180, points)).toBe("180 pts");
    expect(formatScore(182.5, points)).toBe("182.5 pts");
  });
});

it("formats ordinary numeric values with at most two decimals", () => {
  expect(formatNumber(1)).toBe("1");
  expect(formatNumber(1.5)).toBe("1.5");
  expect(formatNumber(1.234)).toBe("1.23");
  expect(formatNumber(-1.235)).toBe("-1.24");
  expect(formatNumber(null)).toBe("—");
  expect(formatNumber(Number.NaN)).toBe("—");
});

it("rounds simple stored numeric labels without changing compound game displays", () => {
  expect(formatNumericDisplay("1.234×")).toBe("1.23×");
  expect(formatNumericDisplay("1.00×")).toBe("1×");
  expect(formatNumericDisplay("3/4 · 32")).toBe("3/4 · 32");
  expect(formatNumericDisplay("1:38")).toBe("1:38");
});

it("formats verified per-guess result details", () => {
  expect(formatResultDetails([{ label: "Q1", value: "1.20×" }, { label: "Q2", value: "1.456×" }]))
    .toBe("Q1 1.2× · Q2 1.46×");
  expect(formatResultDetails()).toBe("");
});

it("prefers a game-specific leaderboard display score", () => {
  const game = { id: "q", slug: "quordle", name: "Quordle", sourceUrl: "", rankingDirection: "lower" as const,
    scoreFormat: { prefix: "", suffix: "", minimumDecimalPlaces: 0, maximumDecimalPlaces: 0 },
    submission: { exampleShareText: "", puzzleLabel: "", scoreLabel: "", scoreMin: 0, scoreMax: null, scoreStep: 1, editableFields: [] },
    manualEntry: { supported: false, puzzleIdRequired: false, completionStatuses: [], fields: [] } };
  expect(formatRankingScore({ rank: 1, userId: "u", shareId: "s", displayName: "P", average: 1,
    gamesPlayed: 1, displayScore: "3/4 · 32" }, game)).toBe("3/4 · 32");
});
