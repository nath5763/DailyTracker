import type { Ranking } from "@/lib/types";

const oneDecimal = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  useGrouping: false,
});

function validAverage(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function formatAveragePlacement(value: number | null | undefined): string {
  return validAverage(value) && value >= 1 ? `#${oneDecimal.format(value)}` : "—";
}

export function formatAverageScore(value: number | null | undefined): string {
  return validAverage(value) ? oneDecimal.format(value) : "—";
}

export function aggregateMetrics(ranking: Ranking) {
  return {
    averagePlacement: formatAveragePlacement(ranking.averagePlacement),
    averageScore: formatAverageScore(ranking.averageScore),
    resultsPlayed: ranking.gamesPlayed,
  };
}
