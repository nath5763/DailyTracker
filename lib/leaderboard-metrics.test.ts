import { expect, test } from "vitest";
import { aggregateMetrics, formatAveragePlacement, formatAverageScore } from "./leaderboard-metrics";
import type { Ranking } from "./types";

const ranking = (values: Partial<Ranking> = {}): Ranking => ({
  rank: 1,
  userId: "player",
  shareId: "share",
  displayName: "Player",
  average: 84,
  gamesPlayed: 3,
  ...values,
});

test("formats backend averages to one decimal only at display time", () => {
  expect(formatAveragePlacement(1.45)).toBe("#1.5");
  expect(formatAverageScore(23.75)).toBe("23.8");
  expect(aggregateMetrics(ranking({ averagePlacement: 2, averageScore: 12 }))).toEqual({
    averagePlacement: "#2.0",
    averageScore: "12.0",
    resultsPlayed: 3,
  });
});

test("does not reinterpret overall rank or leaderboard points as missing averages", () => {
  expect(aggregateMetrics(ranking({ rank: 2, average: 84, leaderboardPoints: 84 }))).toEqual({
    averagePlacement: "—",
    averageScore: "—",
    resultsPlayed: 3,
  });
  expect(formatAveragePlacement(null)).toBe("—");
  expect(formatAveragePlacement(0)).toBe("—");
  expect(formatAverageScore(Number.NaN)).toBe("—");
});

test("keeps tied placements and different participation counts independent", () => {
  const first = aggregateMetrics(ranking({ averagePlacement: 1.5, averageScore: 20, gamesPlayed: 2 }));
  const second = aggregateMetrics(ranking({ rank: 2, averagePlacement: 1.5, averageScore: 20, gamesPlayed: 6 }));
  expect(first.averagePlacement).toBe(second.averagePlacement);
  expect(first.averageScore).toBe(second.averageScore);
  expect([first.resultsPlayed, second.resultsPlayed]).toEqual([2, 6]);
});
