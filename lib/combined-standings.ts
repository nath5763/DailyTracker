import type { Ranking } from "@/lib/types";

export function combinedPerformanceScore(ranking: Ranking): number | null {
  const value = ranking.leaderboardPoints ?? ranking.average;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function formatCombinedPerformance(ranking: Ranking): string {
  const score = combinedPerformanceScore(ranking);
  return score === null ? "—" : score.toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    useGrouping: false,
  });
}

export function combinedPerformanceBar(ranking: Ranking): number {
  const score = combinedPerformanceScore(ranking);
  return score === null ? 0 : Math.min(100, Math.max(0, score));
}

export function gamesPlayedLabel(ranking: Ranking): string {
  return `${ranking.gamesPlayed} game${ranking.gamesPlayed === 1 ? "" : "s"} played`;
}
