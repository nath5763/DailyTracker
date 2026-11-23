import type { Game, Ranking, ResultDetail, Score, ScoreFormat } from "@/lib/types";

const defaultScoreFormat: ScoreFormat = { prefix: "", suffix: "×", minimumDecimalPlaces: 2, maximumDecimalPlaces: 2 };

export function formatScore(value: number | null, format: ScoreFormat = defaultScoreFormat): string {
  if (value === null) return "—";
  if (format.kind === "duration") {
    const seconds = Math.round(value);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }
  const number = Number(value).toLocaleString("en-US", {
    useGrouping: false,
    minimumFractionDigits: format.minimumDecimalPlaces,
    maximumFractionDigits: format.maximumDecimalPlaces,
  });
  return `${format.prefix}${number}${format.suffix}`;
}

export function formatResultScore(score: Score): string {
  return formatStoredScore(score, score.game);
}

export function formatStoredScore(score: { primaryScore: number; metrics?: Record<string, unknown> }, game: Game): string {
  const display = score.metrics?.displayScore;
  return typeof display === "string" ? display : formatScore(score.primaryScore, game.scoreFormat);
}

export function formatRankingScore(ranking: Ranking, game: Game): string {
  return ranking.displayScore || formatScore(ranking.average, game.scoreFormat);
}

export function formatResultDetails(details?: ResultDetail[]): string {
  return details?.map(detail => `${detail.label} ${detail.value}`).join(" · ") ?? "";
}
