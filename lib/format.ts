import type { Score, ScoreFormat } from "@/lib/types";

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
  const display = score.metrics?.displayScore;
  return typeof display === "string" ? display : formatScore(score.primaryScore, score.game.scoreFormat);
}
