import { expect, test } from "vitest";
import { combinedPerformanceBar, combinedPerformanceScore, formatCombinedPerformance, gamesPlayedLabel } from "./combined-standings";
import type { Ranking } from "./types";

const ranking = (values: Partial<Ranking> = {}): Ranking => ({
  rank: 1,
  userId: "player",
  shareId: "share",
  displayName: "Player",
  average: 80,
  gamesPlayed: 3,
  ...values,
});

test("formats authoritative combined performance with at most two decimals", () => {
  const row = ranking({ leaderboardPoints: 92.75, average: 12 });
  expect(combinedPerformanceScore(row)).toBe(92.75);
  expect(formatCombinedPerformance(row)).toBe("92.75");
});

test("uses the normalized 0–100 bar scale and handles missing or defensive out-of-range values", () => {
  expect(combinedPerformanceBar(ranking({ leaderboardPoints: 64.25 }))).toBe(64.25);
  expect(combinedPerformanceBar(ranking({ leaderboardPoints: 120 }))).toBe(100);
  expect(combinedPerformanceBar(ranking({ leaderboardPoints: -5 }))).toBe(0);
  expect(formatCombinedPerformance(ranking({ leaderboardPoints: Number.NaN, average: Number.NaN }))).toBe("—");
});

test("derives the display count from games played rather than participation points", () => {
  expect(gamesPlayedLabel(ranking({ gamesPlayed: 0, participationPoints: 12 }))).toBe("0 games played");
  expect(gamesPlayedLabel(ranking({ gamesPlayed: 1, participationPoints: 99 }))).toBe("1 game played");
  expect(gamesPlayedLabel(ranking({ gamesPlayed: 60, participationPoints: 1 }))).toBe("60 games played");
});
