import type { Game, Ranking, ResultDetail, Score, ScoreFormat } from "@/lib/types";

const defaultScoreFormat: ScoreFormat = { prefix: "", suffix: "×", minimumDecimalPlaces: 0, maximumDecimalPlaces: 2 };

export function formatNumber(value: number | null | undefined, maximumFractionDigits = 2): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", {
    useGrouping: false,
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.max(0, Math.min(2, maximumFractionDigits)),
  });
}

export function formatNumericDisplay(value: string): string {
  const match = /^([^0-9]*)([+-]?\d[\d,]*(?:\.\d+)?)([^0-9]*)$/.exec(value.trim());
  if (!match) return value;
  const numeric = Number(match[2].replaceAll(",", ""));
  return Number.isFinite(numeric) ? `${match[1]}${formatNumber(numeric)}${match[3]}` : value;
}

export function formatScore(value: number | null, format: ScoreFormat = defaultScoreFormat): string {
  if (value === null) return "—";
  if (format.kind === "duration") {
    const seconds = Math.round(value);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }
  const number = formatNumber(Number(value), format.maximumDecimalPlaces);
  return `${format.prefix}${number}${format.suffix}`;
}

export function formatResultScore(score: Score): string {
  return formatStoredScore(score, score.game);
}

export function formatStoredScore(score: { primaryScore: number; metrics?: Record<string, unknown> }, game: Game): string {
  const display = score.metrics?.displayScore;
  return typeof display === "string" ? formatNumericDisplay(display) : formatScore(score.primaryScore, game.scoreFormat);
}

export function formatRankingScore(ranking: Ranking, game: Game): string {
  return ranking.displayScore ? formatNumericDisplay(ranking.displayScore) : formatScore(ranking.average, game.scoreFormat);
}

export function formatResultDetails(details?: ResultDetail[]): string {
  return details?.map(detail => `${detail.label} ${formatNumericDisplay(detail.value)}`).join(" · ") ?? "";
}
