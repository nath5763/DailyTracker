import type { Ranking } from "@/lib/types";
import { formatNumber } from "@/lib/format";

function validAverage(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function formatAveragePlacement(value: number | null | undefined): string {
  return validAverage(value) && value >= 1 ? `#${formatNumber(value)}` : "—";
}

export function formatAverageScore(value: number | null | undefined): string {
  return validAverage(value) ? formatNumber(value) : "—";
}

export function aggregateMetrics(ranking: Ranking) {
  return {
    averagePlacement: formatAveragePlacement(ranking.averagePlacement),
    averageScore: formatAverageScore(ranking.averageScore),
    resultsPlayed: ranking.gamesPlayed,
  };
}
