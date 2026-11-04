import type { ParsedSubmission } from "./types";

const starts: Record<string, string> = {
  wordle: "2021-06-19", pinpoint: "2024-05-01", queens: "2024-05-01",
  crossclimb: "2024-05-01", tango: "2024-10-08", zip: "2025-03-18",
};
const names: Record<string, string> = {
  pinpoint: "Pinpoint", queens: "Queens", crossclimb: "Crossclimb", tango: "Tango", zip: "Zip",
};
function invalid(message: string): never { throw new Error(message); }
function date(slug: string, puzzle: number) {
  return new Date(Date.parse(`${starts[slug]}T00:00:00Z`) + (puzzle - 1) * 86_400_000).toISOString().slice(0, 10);
}
function lines(raw: string) {
  if (raw.length > 10_000) invalid("Result text is too long.");
  return raw.trim().split(/\r\n|\n|\r/).map((line) => line.trim()).filter(Boolean);
}
function puzzleNumber(raw: string) {
  const value = Number(raw.replaceAll(",", ""));
  if (!Number.isSafeInteger(value) || value < 1 || value > 100_000) invalid("Puzzle number is invalid.");
  return value;
}
function count(text: string, pattern: RegExp) {
  const matches = [...text.matchAll(pattern)];
  if (matches.length > 1) invalid("Ambiguous assistance details.");
  const value = matches.length ? Number(matches[0][1]) : 0;
  if (value > 999) invalid("Assistance count is invalid.");
  return value;
}
export function extendedPreviewScore(slug: string, raw: string): ParsedSubmission {
  let parts = lines(raw);
  if (slug === "wordle") {
    if (/^https:\/\/www\.nytimes\.com\/games\/wordle(?:\/index\.html)?\/?$/.test(parts.at(-1) ?? "")) parts = parts.slice(0, -1);
    const header = /^Wordle\s+([0-9][0-9,]*)\s+([1-6X])\/6(\*)?$/i.exec(parts[0] ?? "");
    if (!header) invalid("Wordle puzzle number and score are required.");
    const puzzle = puzzleNumber(header[1]);
    const guesses = header[2].toUpperCase() === "X" ? 7 : Number(header[2]);
    if (parts.length !== (guesses === 7 ? 7 : guesses + 1) || !parts.slice(1).every((row) => /^[⬛⬜🟨🟩]{5}$/u.test(row)))
      invalid("Wordle grid must match the guess count.");
    if (parts.slice(1, -1).includes("🟩🟩🟩🟩🟩") || (parts.at(-1) === "🟩🟩🟩🟩🟩") !== (guesses !== 7))
      invalid("Wordle grid and score disagree.");
    return { puzzleKey: String(puzzle), puzzleNumber: puzzle, playedOn: date(slug, puzzle), primaryScore: guesses,
      metrics: { displayScore: `${header[2].toUpperCase()}/6${header[3] ?? ""}`, hardMode: Boolean(header[3]) }, parserVersion: 1 };
  }
  const name = names[slug];
  if (!name) invalid("Preview is not available for this game yet.");
  const text = parts.join(" ");
  const header = new RegExp(`^${name}\\s+#\\s*(\\d+)\\s*\\|`, "i").exec(text);
  if (!header) invalid(`${name} puzzle number and score are required.`);
  const puzzle = puzzleNumber(header[1]);
  const timed = slug !== "pinpoint";
  const scorePattern = timed ? /\|\s*(\d{1,3}):([0-5]\d)\b/g : /\|\s*([1-5])\s+guess(?:es)?\b/gi;
  const scores = [...text.matchAll(scorePattern)];
  if (scores.length !== 1 || scores[0].index !== header[0].length - 1) invalid(`Could not read an unambiguous ${name} score.`);
  const value = timed ? Number(scores[0][1]) * 60 + Number(scores[0][2]) : Number(scores[0][1]);
  if (value < 1) invalid("Score must be positive.");
  const required: Record<string, string[]> = {
    pinpoint: ["📌", "100% match"],
    queens: ["First 👑s:"],
    crossclimb: ["Fill order:", "🪜"],
    tango: ["First 5 placements:"],
    zip: ["🏁"],
  };
  const gameLink = new RegExp(`(?:lnkd\\.in/|(?:www\\.)?linkedin\\.com/games/)${slug}(?:/|\\b)`, "i");
  if (!required[slug].every((marker) => text.includes(marker)) || !gameLink.test(text)) invalid(`${name} needs its completed share details.`);
  if (slug === "pinpoint") {
    const percentages = [...text.matchAll(/\b\d{1,3}% match\b/gi)].map((match) => match[0].toLowerCase());
    if (percentages.length !== value || percentages.at(-1) !== "100% match") invalid("Pinpoint needs its completed share details.");
  }
  if (slug === "queens" && [...text.slice(text.indexOf("First 👑s:") + 10).matchAll(/[🟥🟧🟨🟩🟦🟪🟫⬜]/gu)].length < 3)
    invalid("Queens needs its first three crown colors.");
  if (slug === "crossclimb" && !text.slice(text.indexOf("Fill order:")).includes("️⃣")) invalid("Crossclimb fill order is missing.");
  if (slug === "tango" && !["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"].every((marker) => text.includes(marker))) invalid("Tango first five placements are missing.");
  const metrics: Record<string, unknown> = {
    hints: count(text, /\b(?:with\s+)?(\d+)\s+hints?\b/gi),
    mistakes: count(text, /\b(?:with\s+)?(\d+)\s+mistakes?\b/gi),
    beginnerAssists: count(text, /\b(\d+)\s+(?:pre[- ]filled|starter)\b/gi),
    displayScore: timed ? `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}` : `${value} ${value === 1 ? "guess" : "guesses"}`,
  };
  const noHints = /no hints/i.test(text);
  const noMistakes = /no mistakes|and flawless/i.test(text);
  metrics.assistanceStatus = Number(metrics.hints) > 0 || Number(metrics.mistakes) > 0 || Number(metrics.beginnerAssists) > 0
    ? "assisted" : noHints && (slug === "zip" || noMistakes) ? "unassisted" : "unknown";
  if (slug === "zip") {
    const backtracks = [...text.matchAll(/\b(?:with\s+)?(\d+)\s+backtracks?\b/gi)];
    if (backtracks.length > 1) invalid("Ambiguous backtracks.");
    if (backtracks.length || /no backtracks/i.test(text)) metrics.backtracks = backtracks.length ? Number(backtracks[0][1]) : 0;
  }
  return { puzzleKey: String(puzzle), puzzleNumber: puzzle, playedOn: date(slug, puzzle), primaryScore: value, metrics, parserVersion: 1 };
}
