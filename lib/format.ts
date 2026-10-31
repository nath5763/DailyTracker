import type { ScoreFormat } from "@/lib/types";

const defaultScoreFormat: ScoreFormat = { prefix: "", suffix: "×", minimumDecimalPlaces: 2, maximumDecimalPlaces: 2 };

export function formatScore(value: number | null, format: ScoreFormat = defaultScoreFormat): string {
  if (value === null) return "—";
  const number = Number(value).toLocaleString("en-US", {
    useGrouping: false,
    minimumFractionDigits: format.minimumDecimalPlaces,
    maximumFractionDigits: format.maximumDecimalPlaces,
  });
  return `${format.prefix}${number}${format.suffix}`;
}
