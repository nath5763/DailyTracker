import type { GameAdapter, ParsedSubmission, ParseResult } from "@/lib/types";

export const FERMI_PARSER_VERSION = 1;
const FERMI_FIRST_PUZZLE = "2026-07-27";

export function dateForFermiPuzzle(puzzleNumber: number): string {
  const [year, month, day] = FERMI_FIRST_PUZZLE.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + puzzleNumber - 1));
  return date.toISOString().slice(0, 10);
}

function findScore(text: string): number | null {
  const explicit = text.match(/(\d+(?:[.,]\d+)?)\s*[×x]\s*score\b/i);
  if (explicit) return Number(explicit[1].replace(",", "."));

  const scoreLine = text
    .split(/\r?\n/)
    .find((line) => /score/i.test(line) && /\d\s*[×x]/i.test(line));
  const fallback = scoreLine?.match(/(\d+(?:[.,]\d+)?)\s*[×x]/i);
  return fallback ? Number(fallback[1].replace(",", ".")) : null;
}

export function parseFermiShareText(rawText: string): ParseResult {
  const text = rawText.trim();
  const errors: string[] = [];

  if (!text) return { ok: false, errors: ["Paste your Fermi result first."] };
  if (text.length > 10_000) return { ok: false, errors: ["Result text is too long."] };
  if (!/fermi/i.test(text)) errors.push("This does not look like a Fermi result.");

  const puzzleMatch = text.match(/(?:fermi\s*)?#\s*(\d+)/i) ?? text.match(/\bNo\.?\s*(\d+)/i);
  const puzzleNumber = puzzleMatch ? Number(puzzleMatch[1]) : Number.NaN;
  if (!Number.isInteger(puzzleNumber) || puzzleNumber < 1) {
    errors.push("Could not find a valid Fermi puzzle number.");
  }

  const primaryScore = findScore(text) ?? Number.NaN;
  if (!Number.isFinite(primaryScore) || primaryScore < 1) {
    errors.push("Could not find a valid final score of 1× or greater.");
  }

  if (errors.length) return { ok: false, errors };

  const percentileMatch = text.match(/top\s*(\d+(?:\.\d+)?)\s*%/i);
  const allMultipliers = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*[×x]/gi)].map((match) =>
    Number(match[1].replace(",", ".")),
  );
  const components = allMultipliers.filter((score) => score !== primaryScore).slice(0, 3);

  return {
    ok: true,
    value: {
      puzzleKey: String(puzzleNumber),
      puzzleNumber,
      playedOn: dateForFermiPuzzle(puzzleNumber),
      primaryScore,
      metrics: {
        ...(percentileMatch ? { percentile: Number(percentileMatch[1]) } : {}),
        ...(components.length ? { components } : {}),
      },
      parserVersion: FERMI_PARSER_VERSION,
    },
  };
}

export const fermiAdapter: GameAdapter = {
  slug: "fermi",
  parseShareText: parseFermiShareText,
  validate(value: ParsedSubmission) {
    const errors: string[] = [];
    if (!Number.isInteger(value.puzzleNumber) || value.puzzleNumber < 1) {
      errors.push("Puzzle number must be a positive integer.");
    }
    if (!Number.isFinite(value.primaryScore) || value.primaryScore < 1) {
      errors.push("Fermi scores must be 1× or greater.");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value.playedOn)) errors.push("Date must use YYYY-MM-DD.");
    return errors;
  },
  formatScore: (score) => `${score.toFixed(2)}×`,
  compare: (left, right) => left - right,
  aggregate(scores) {
    if (!scores.length) return null;
    return scores.reduce((total, score) => total + score, 0) / scores.length;
  },
};
