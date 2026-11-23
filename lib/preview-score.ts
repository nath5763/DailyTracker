import type { ParsedSubmission } from "./types";
import { extendedPreviewScore } from "./extended-preview-score";
import { dailyOrbsPreview, dailySetPreview, globlePreview, minuteCrypticPreview, nerdlePreview } from "./tracked-preview-score";
import { formatNumber } from "./format";

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
  let score = scoreMatch ? decimal(scoreMatch[1]) : NaN;
  if (!Number.isFinite(score)) {
    const scoreLine = text.split(/\r\n|\n|\r/).find((line) => line.toLowerCase().includes("score") && /(\d+(?:[.,]\d+)*)\s*[×x]/i.test(line));
    const fallback = scoreLine ? /(\d+(?:[.,]\d+)*)\s*[×x]/i.exec(scoreLine) : null;
    score = fallback ? decimal(fallback[1]) : NaN;
  }
  if (!Number.isFinite(score) || score < 1) errors.push("Could not find a valid final score of 1× or greater.");
  if (errors.length) throw new Error(errors.join(" "));

  const metrics: Record<string, unknown> = {};
  metrics.displayScore = `${formatNumber(score)}×`;
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

const farflungDistances: Record<string, number> = {
  Miss: 0,
  Common: 40,
  Uncommon: 55,
  Rare: 70,
  Elusive: 85,
  Farflung: 100,
};

function farflung(rawText: string): ParsedSubmission {
  const text = rawText.trim();
  if (!text) throw new Error("Paste your complete Farflung result first.");
  if (text.length > 10_000) throw new Error("Result text is too long.");
  const lines = text.split(/\r\n|\n|\r/).map(line => line.trim()).filter(Boolean);
  if (lines.length !== 3) throw new Error("Paste a complete standard Farflung daily result.");

  const header = /^Farflung #([1-9][0-9]*) · ([0-9]{1,3})\/500 km$/.exec(lines[0]);
  if (!header) throw new Error("Farflung needs a numbered expedition and distance out of 500 km.");
  const puzzle = Number(header[1]);
  if (!Number.isSafeInteger(puzzle) || puzzle < 1 || puzzle > 100_000) {
    throw new Error("Farflung expedition number is invalid.");
  }
  const distance = Number(header[2]);

  const rarities = lines[1].split(" · ");
  if (rarities.length !== 5 || rarities.some(rarity => farflungDistances[rarity] === undefined)) {
    throw new Error("Farflung results must contain exactly five valid rarity labels.");
  }
  const expectedDistance = rarities.reduce((sum, rarity) => sum + farflungDistances[rarity], 0);
  if (distance !== expectedDistance) throw new Error("Farflung distance does not match the five rarity results.");

  const shareUrl = /^https:\/\/farflung\.game\/s\/[a-z0-9]{6}\?e=([1-9][0-9]*)$/.exec(lines[2]);
  if (!shareUrl || Number(shareUrl[1]) !== puzzle) {
    throw new Error("Farflung needs its matching official result link.");
  }

  const playedOn = puzzleDate("2026-10-05", puzzle);
  const tomorrow = new Date(Date.now() + DAY_MS).toISOString().slice(0, 10);
  if (playedOn > tomorrow) throw new Error("That Farflung expedition appears to be dated in the future.");
  return {
    puzzleKey: String(puzzle),
    puzzleNumber: puzzle,
    playedOn,
    primaryScore: distance,
    metrics: {
      completionStatus: "WIN",
      distanceKm: distance,
      rarities,
      gameMode: "Daily",
      scoreRaw: `${distance}/500 km`,
      scoreUnit: "km",
      displayScore: `${distance}/500 km`,
    },
    parserVersion: 1,
  };
}

const perceptleScores = /^🔢\s*([0-9]{1,3})\s*🎯\s*([0-9]{1,3})\s*📐\s*([0-9]{1,3})\s*🥁\s*([0-9]{1,3})\s*✂\uFE0F?\s*([0-9]{1,3})$/u;

function perceptleGrade(score: number) {
  if (score >= 95) return "S";
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

function perceptle(rawText: string): ParsedSubmission {
  const text = rawText.trim();
  if (!text) throw new Error("Paste your complete Perceptle result first.");
  if (text.length > 10_000) throw new Error("Result text is too long.");
  const lines = text.split(/\r\n|\n|\r/).map(line => line.trim()).filter(Boolean);
  if (lines.length !== 3) throw new Error("Paste a complete standard Perceptle daily result.");

  const header = /^Perceptle #([1-9][0-9]*) - ([SABCDF]) \(([0-9]{1,3})\)$/.exec(lines[0]);
  if (!header) throw new Error("Perceptle needs a numbered daily score and grade.");
  const puzzle = Number(header[1]);
  if (!Number.isSafeInteger(puzzle) || puzzle < 1 || puzzle > 100_000) {
    throw new Error("Perceptle puzzle number is invalid.");
  }
  const grade = header[2];
  const overallScore = Number(header[3]);
  if (overallScore > 100) throw new Error("Perceptle scores must be between 0 and 100.");

  const scoreMatch = perceptleScores.exec(lines[1]);
  if (!scoreMatch) throw new Error("Perceptle results must contain exactly five valid event scores.");
  const eventScores = scoreMatch.slice(1).map(Number);
  if (eventScores.some(score => score > 100)) {
    throw new Error("Perceptle event scores must be between 0 and 100.");
  }
  const expectedOverall = Math.round(eventScores.reduce((sum, score) => sum + score, 0) / 5);
  if (overallScore !== expectedOverall) {
    throw new Error("Perceptle score does not match the rounded event average.");
  }
  if (grade !== perceptleGrade(overallScore)) {
    throw new Error("Perceptle grade does not match the overall score.");
  }
  if (lines[2] !== "https://perceptle.io/") throw new Error("Perceptle needs its official result link.");

  const playedOn = puzzleDate("2026-07-18", puzzle);
  if (playedOn > new Date().toISOString().slice(0, 10)) {
    throw new Error("That Perceptle puzzle appears to be dated in the future.");
  }
  return {
    puzzleKey: String(puzzle),
    puzzleNumber: puzzle,
    playedOn,
    primaryScore: overallScore,
    metrics: {
      completionStatus: "WIN",
      overallScore,
      countScore: eventScores[0],
      trackScore: eventScores[1],
      angleScore: eventScores[2],
      tempoScore: eventScores[3],
      splitScore: eventScores[4],
      grade,
      gameMode: "Daily",
      scoreRaw: String(overallScore),
      scoreUnit: "points",
      displayScore: `${grade} (${overallScore})`,
    },
    parserVersion: 1,
  };
}

const gazillionHeader = /^Gazillion #([1-9][0-9]*) · ((?:0|[1-9][0-9]{0,2}(?:,[0-9]{3})?))\/5,000(?: · 🔥([1-9][0-9]*))?$/;
const gazillionResults = /^([🏆🥇🥈🥉✅🤏❌]{5})(?:  top ([1-9][0-9]?)%)?$/u;
const gazillionTravel = /^([🏙🏰🐪🔥🦣🦖🌋💥])\uFE0F? Travelled back to (.+)$/u;
const gazillionChallenge = /^Can you beat ((?:0|[1-9][0-9]{0,2}(?:,[0-9]{3})?))\?\s+(?:👉\s+)?(https:\/\/gazillion\.world\/?(?:\?[^\s#]+)?)$/;
const gazillionPerfect = "💎 PERFECT 5,000 · ONE IN A GAZILLION 💎";
const gazillionSources = new Set(["cp", "sh", "wa", "x", "tg", "sms", "bs"]);
const gazillionTiers: Record<string, { id: string; minimum: number; maximum: number }> = {
  "🏆": { id: "perfect", minimum: 950, maximum: 1000 },
  "🥇": { id: "gold", minimum: 800, maximum: 949 },
  "🥈": { id: "silver", minimum: 600, maximum: 799 },
  "🥉": { id: "bronze", minimum: 400, maximum: 599 },
  "✅": { id: "caught", minimum: 1, maximum: 399 },
  "🤏": { id: "close", minimum: 1, maximum: 399 },
  "❌": { id: "miss", minimum: 0, maximum: 0 },
};
const gazillionEraMinimums = [0, 700, 1400, 2100, 2800, 3500, 4200, 4800];
const gazillionEraEmojis = ["🏙", "🏰", "🐪", "🔥", "🦣", "🦖", "🌋", "💥"];

function gazillionPoints(value: string) {
  return Number(value.replaceAll(",", ""));
}

function gazillionFormat(value: number) {
  return value.toLocaleString("en-US", { useGrouping: true, maximumFractionDigits: 0 });
}

function expectedGazillionEra(score: number) {
  let emoji = gazillionEraEmojis[0];
  for (let index = 1; index < gazillionEraMinimums.length; index++) {
    if (score >= gazillionEraMinimums[index]) emoji = gazillionEraEmojis[index];
  }
  return emoji;
}

function validateGazillionUrl(rawUrl: string, score: number, puzzle: number) {
  let url: URL;
  try { url = new URL(rawUrl); }
  catch { throw new Error("Gazillion needs a valid official result link."); }
  if (url.protocol !== "https:" || url.hostname !== "gazillion.world" || url.port || url.username || url.password ||
      url.pathname !== "/" || url.hash) {
    throw new Error("Gazillion needs a valid official result link.");
  }
  if (!url.search) return;
  const allowed = new Set(["s", "r", "c", "d", "by"]);
  const keys = [...url.searchParams.keys()];
  if (keys.some(key => !allowed.has(key) || url.searchParams.getAll(key).length !== 1 || !url.searchParams.get(key)) ||
      !gazillionSources.has(url.searchParams.get("s") ?? "") ||
      url.searchParams.get("c") !== String(score) || url.searchParams.get("d") !== String(puzzle)) {
    throw new Error("Gazillion needs its matching official result link.");
  }
  const reference = url.searchParams.get("r");
  if (reference !== null && !/^[a-z0-9]{8,12}$/.test(reference)) {
    throw new Error("Gazillion needs its matching official result link.");
  }
}

function gazillion(rawText: string): ParsedSubmission {
  const text = rawText.trim();
  if (!text) throw new Error("Paste your complete Gazillion result first.");
  if (text.length > 10_000) throw new Error("Result text is too long.");
  const lines = text.split(/\r\n|\n|\r/).map(line => line.trim()).filter(Boolean);
  const perfectBanner = lines.length === 5 && lines[0] === gazillionPerfect;
  if (lines.length !== 4 && !perfectBanner) {
    throw new Error("Paste a complete standard English Gazillion daily result.");
  }
  const offset = perfectBanner ? 1 : 0;
  const header = gazillionHeader.exec(lines[offset]);
  const resultLine = gazillionResults.exec(lines[offset + 1]);
  const travel = gazillionTravel.exec(lines[offset + 2]);
  const challenge = gazillionChallenge.exec(lines[offset + 3]);
  if (!header || !resultLine || !travel || !challenge) {
    throw new Error("Paste a complete standard English Gazillion daily result.");
  }

  const puzzle = Number(header[1]);
  if (!Number.isSafeInteger(puzzle) || puzzle < 1 || puzzle > 100_000) {
    throw new Error("Gazillion daily number is invalid.");
  }
  const score = gazillionPoints(header[2]);
  if (score > 5_000 || gazillionPoints(challenge[1]) !== score) {
    throw new Error("Gazillion score details do not match.");
  }
  if (perfectBanner !== (score === 5_000)) {
    throw new Error("Gazillion's perfect-score banner does not match the score.");
  }
  const streak = header[3] === undefined ? undefined : Number(header[3]);
  if (streak !== undefined && (!Number.isSafeInteger(streak) || streak < 2 || streak > 100_000)) {
    throw new Error("Gazillion streak is invalid.");
  }
  const percentile = resultLine[2] === undefined ? undefined : Number(resultLine[2]);
  if (percentile !== undefined && percentile > 50) throw new Error("Gazillion percentile is invalid.");

  const tiers = [...resultLine[1]].map(emoji => gazillionTiers[emoji]);
  if (tiers.length !== 5 || tiers.some(tier => !tier)) {
    throw new Error("Gazillion needs exactly five result tiers.");
  }
  const minimum = tiers.reduce((sum, tier) => sum + tier.minimum, 0);
  const maximum = tiers.reduce((sum, tier) => sum + tier.maximum, 0);
  if (score < minimum || score > maximum) {
    throw new Error("Gazillion score is not possible for the five result tiers.");
  }
  if (travel[1] !== expectedGazillionEra(score)) {
    throw new Error("Gazillion's travelled-back era does not match the score.");
  }
  validateGazillionUrl(challenge[2], score, puzzle);

  const playedOn = puzzleDate("2026-10-23", puzzle);
  const tomorrow = new Date(Date.now() + DAY_MS).toISOString().slice(0, 10);
  if (playedOn > tomorrow) throw new Error("That Gazillion daily appears to be dated in the future.");
  const displayScore = `${gazillionFormat(score)}/5,000`;
  return {
    puzzleKey: String(puzzle),
    puzzleNumber: puzzle,
    playedOn,
    primaryScore: score,
    metrics: {
      completionStatus: "WIN",
      totalScore: score,
      maximumScore: 5_000,
      resultTiers: tiers.map(tier => tier.id),
      ...(percentile === undefined ? {} : { percentile }),
      ...(streak === undefined ? {} : { streak }),
      travelledBackTo: travel[2],
      gameMode: "Daily",
      scoreRaw: displayScore,
      scoreUnit: "points",
      displayScore,
    },
    parserVersion: 1,
  };
}

export function previewScore(gameSlug: string, rawText: string): ParsedSubmission {
  if (gameSlug === "fermi") return fermi(rawText);
  if (gameSlug === "krillion") return krillion(rawText);
  if (gameSlug === "travle") return travle(rawText);
  if (gameSlug === "farflung") return farflung(rawText);
  if (gameSlug === "perceptle") return perceptle(rawText);
  if (gameSlug === "gazillion") return gazillion(rawText);
  if (gameSlug === "daily-set") return dailySetPreview(rawText);
  if (gameSlug === "daily-orbs") return dailyOrbsPreview(rawText);
  if (gameSlug === "minute-cryptic") return minuteCrypticPreview(rawText);
  if (gameSlug === "nerdle") return nerdlePreview(rawText);
  if (gameSlug === "globle") return globlePreview(rawText);
  if (["wordle", "pinpoint", "queens", "crossclimb", "tango", "zip"].includes(gameSlug)) return extendedPreviewScore(gameSlug, rawText);
  throw new Error("Preview is not available for this game yet.");
}
