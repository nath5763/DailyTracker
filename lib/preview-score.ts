import type { ParsedSubmission } from "./types";
import { extendedPreviewScore } from "./extended-preview-score";

const DAY_MS = 24 * 60 * 60 * 1000;
const multiplier = /(\d+(?:[.,]\d+)*)\s*[×x]/gi;

function puzzleDate(first: string, puzzle: number) {
  return new Date(Date.parse(`${first}T00:00:00Z`) + (puzzle - 1) * DAY_MS).toISOString().slice(0, 10);
}

function decimal(value: string) {
  const normalized = /^[0-9]{1,3}(,[0-9]{3})+(?:\.[0-9]+)?$/.test(value)
    ? value.replaceAll(",", "") : value.replace(",", ".");
  return Number(normalized);
}

function fermi(rawText: string): ParsedSubmission {
  const text = rawText.trim();
  if (!text) throw new Error("Paste your Fermi result first.");
  if (text.length > 10_000) throw new Error("Result text is too long.");
  const errors: string[] = [];
  if (!text.toLowerCase().includes("fermi")) errors.push("This does not look like a Fermi result.");
  const puzzleMatch = /(?:fermi\s*)?#\s*(\d+)/i.exec(text) ?? /\bNo\.?\s*(\d+)/i.exec(text);
  const puzzle = puzzleMatch ? Number(puzzleMatch[1]) : NaN;
  if (!Number.isSafeInteger(puzzle) || puzzle < 1 || puzzle > 2_147_483_647) errors.push("Could not find a valid Fermi puzzle number.");
  const scoreMatch = /(\d+(?:[.,]\d+)*)\s*[×x]\s*score\b/i.exec(text);
  let scoreToken = scoreMatch?.[1];
  let score = scoreMatch ? decimal(scoreMatch[1]) : NaN;
  if (!Number.isFinite(score)) {
    const scoreLine = text.split(/\r\n|\n|\r/).find((line) => line.toLowerCase().includes("score") && /(\d+(?:[.,]\d+)*)\s*[×x]/i.test(line));
    const fallback = scoreLine ? /(\d+(?:[.,]\d+)*)\s*[×x]/i.exec(scoreLine) : null;
    scoreToken = fallback?.[1];
    score = fallback ? decimal(fallback[1]) : NaN;
  }
  if (!Number.isFinite(score) || score < 1) errors.push("Could not find a valid final score of 1× or greater.");
  if (errors.length) throw new Error(errors.join(" "));

  const metrics: Record<string, unknown> = {};
  if (scoreToken) {
    const display = /^[0-9]{1,3}(,[0-9]{3})+(?:\.[0-9]+)?$/.test(scoreToken)
      ? scoreToken : scoreToken.replace(",", ".");
    metrics.displayScore = `${display}×`;
  }
  const percentile = /top\s*(\d+(?:\.\d+)?)\s*%/i.exec(text);
  if (percentile) metrics.percentile = Number(percentile[1]);
  const components: number[] = [];
  let skippedFallbackScore = false;
  for (const match of text.matchAll(multiplier)) {
    if (components.length === 3) break;
    const value = decimal(match[1]);
    const inFinalScore = scoreMatch?.index !== undefined && match.index >= scoreMatch.index &&
      match.index + match[0].length <= scoreMatch.index + scoreMatch[0].length;
    if (inFinalScore || !scoreMatch && !skippedFallbackScore && value === score) skippedFallbackScore = true;
    else components.push(value);
  }
  if (components.length) metrics.components = components;
  return { puzzleKey: String(puzzle), puzzleNumber: puzzle, playedOn: puzzleDate("2026-07-27", puzzle), primaryScore: score, metrics, parserVersion: 1 };
}

const tiers: Record<string, { id: string; score: number }> = {
  "⬛": { id: "miss", score: 0 },
  "🫧": { id: "plankton", score: 10 },
  "🤡": { id: "too-clever", score: 15 },
  "🐟": { id: "schooler", score: 30 },
  "🦑": { id: "rare", score: 60 },
  "🏮": { id: "deep-cut", score: 85 },
  "🌟": { id: "krillion", score: 100 },
};
const symbol = /⬛|🫧|🤡|🐟|🦑|🏮|🌟/gu;

function krillion(rawText: string): ParsedSubmission {
  const text = rawText.trim();
  if (!text) throw new Error("Paste your Krillion result first.");
  if (text.length > 10_000) throw new Error("Result text is too long.");
  const lines = text.split(/\r\n|\n|\r/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 3 || lines.length > 4 || (lines.length === 4 && !/^https:\/\/krillion\.io\/?$/.test(lines[3]))) {
    throw new Error("Paste a complete Krillion daily result.");
  }
  const header = /^Krillion\s+#\s*(\d+)\s*🦐$/u.exec(lines[0]);
  if (!header) throw new Error("Only numbered Krillion daily results are supported.");
  const puzzle = Number(header[1]);
  if (!Number.isInteger(puzzle) || puzzle < 1 || puzzle > 100_000) throw new Error("Could not find a valid Krillion dive number.");
  const scoreMatch = /^(\d{1,3})$/.exec(lines[1]);
  if (!scoreMatch) throw new Error("Could not find a valid Krillion score.");
  const score = Number(scoreMatch[1]);
  if (score > 700) throw new Error("Krillion scores must be between 0 and 700 points.");

  const symbols = lines[2].replace(/\uFE0F/g, "");
  const matches = [...symbols.matchAll(symbol)];
  const remainder = symbols.replace(symbol, "").replace(/\s/g, "");
  if (remainder || matches.length !== 7) throw new Error("Krillion results must contain exactly seven result symbols.");
  const results = matches.map((match) => tiers[match[0]]);
  if (results.reduce((sum, tier) => sum + tier.score, 0) !== score) throw new Error("The Krillion score does not match its seven result symbols.");
  return { puzzleKey: String(puzzle), puzzleNumber: puzzle, playedOn: puzzleDate("2026-07-16", puzzle), primaryScore: score,
    metrics: { tiers: results.map((tier) => tier.id) }, parserVersion: 1 };
}

const travleResult = "(?:✅|🟩|🟧|🟥)+";
const travleHeader = new RegExp(
  `^#(travle|travle_challenge) #([1-9][0-9]*) \\+([0-6])(?: \\((?:(Perfect)|([0-3]) (hint|hints))\\))?\\s*(${travleResult})$`,
  "u",
);

function travle(rawText: string): ParsedSubmission {
  const text = rawText.trim();
  if (!text) throw new Error("Paste your complete Travle result first.");
  if (text.length > 10_000) throw new Error("Result text is too long.");
  const lines = text.split(/\r\n|\n|\r/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2 || lines.length > 3) throw new Error("Paste a complete English Travle result.");

  const match = travleHeader.exec(lines.slice(0, -1).join(" "));
  if (!match) throw new Error("Travle needs a numbered Daily or Weekly Challenge header and a result path.");
  const [, shareMode, puzzleToken, scoreToken, perfect, hintToken, hintWord, resultSequence] = match;
  const gameMode = shareMode === "travle" ? "Daily" : "Weekly";
  const expectedUrl = gameMode === "Daily" ? /^https:\/\/travle\.earth\/?$/ : /^https:\/\/travle\.earth\/challenge\/?$/;
  if (!expectedUrl.test(lines.at(-1) ?? "")) throw new Error(`Travle ${gameMode} results need their matching official link.`);

  const puzzle = Number(puzzleToken);
  if (!Number.isSafeInteger(puzzle) || puzzle < 1 || puzzle > 100_000) throw new Error("Travle puzzle number is invalid.");
  const extraGuesses = Number(scoreToken);
  const hints = hintToken === undefined ? 0 : Number(hintToken);
  if (perfect && extraGuesses !== 0) throw new Error("Only a +0 Travle result can be Perfect.");
  if (hintToken !== undefined && ((hints === 1) !== (hintWord === "hint"))) {
    throw new Error("Travle hint text must use the correct singular or plural form.");
  }

  const playedOn = gameMode === "Daily"
    ? new Date(Date.parse("2026-11-22T00:00:00Z") + (puzzle - 1439) * DAY_MS).toISOString().slice(0, 10)
    : new Date(Date.parse("2024-10-21T00:00:00Z") + (puzzle - 38) * 7 * DAY_MS).toISOString().slice(0, 10);
  if (playedOn > new Date().toISOString().slice(0, 10)) throw new Error("That Travle puzzle appears to be dated in the future.");

  return {
    puzzleKey: `${gameMode}:${puzzle}`,
    puzzleNumber: puzzle,
    playedOn,
    primaryScore: extraGuesses,
    metrics: {
      completionStatus: "WIN",
      extraGuesses,
      hints,
      assistanceStatus: hints > 0 ? "assisted" : "unassisted",
      resultSequence,
      gameMode,
      displayScore: `+${extraGuesses}`,
    },
    parserVersion: 1,
  };
}

export function previewScore(gameSlug: string, rawText: string): ParsedSubmission {
  if (gameSlug === "fermi") return fermi(rawText);
  if (gameSlug === "krillion") return krillion(rawText);
  if (gameSlug === "travle") return travle(rawText);
  if (["wordle", "pinpoint", "queens", "crossclimb", "tango", "zip"].includes(gameSlug)) return extendedPreviewScore(gameSlug, rawText);
  throw new Error("Preview is not available for this game yet.");
}
