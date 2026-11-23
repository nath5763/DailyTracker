import type { ParsedSubmission } from "./types";

const DAY_MS = 86_400_000;
const monthNumbers: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
  January: 1, February: 2, March: 3, April: 4, June: 6, July: 7,
  August: 8, September: 9, October: 10, November: 11, December: 12,
};

function invalid(message: string): never { throw new Error(message); }
function lines(raw: string) {
  const text = raw.normalize("NFC").replaceAll("\uFE0F", "").replaceAll("\uFE0E", "").trim();
  if (text.length > 10_000) invalid("Result text is too long.");
  return text ? text.split(/\r\n|\n|\r/).map(line => line.trim()).filter(Boolean) : [];
}
function isoDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) invalid("Puzzle date is invalid.");
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) invalid("Puzzle date is invalid.");
  return isoDate(Number(match[1]), Number(match[2]), Number(match[3]));
}
function dateInZone(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date());
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}
function duration(seconds: number) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }

export function dailySetPreview(raw: string): ParsedSubmission {
  const parts = lines(raw);
  if (parts.length !== 2 && parts.length !== 3) invalid("Paste a complete Daily Set result.");
  const header = /^The Daily Set ([🎯🔥]) ([A-Z][a-z]{2}) ([1-9]|[12]\d|3[01])$/u.exec(parts[0]);
  const url = /^https:\/\/setpuzzle\.com\/share\/(\d{4}-\d{2}-\d{2})\/((?:0|[1-9]\d*)-([0-5]\d))\/(regular|diablo)$/.exec(parts.at(-1) ?? "");
  if (!header || !url) invalid("Daily Set needs its matching official result link.");
  const playedOn = parseIsoDate(url[1]);
  const year = Number(playedOn.slice(0, 4));
  const displayed = isoDate(year, monthNumbers[header[2]] ?? 0, Number(header[3]));
  if (displayed !== playedOn || playedOn > dateInZone("America/Los_Angeles")) invalid("Daily Set puzzle date is invalid.");
  const expectedIcon = url[4] === "diablo" ? "🔥" : "🎯";
  if (header[1] !== expectedIcon) invalid("Daily Set mode and icon disagree.");
  const minutes = Number(url[2].slice(0, url[2].indexOf("-")));
  const elapsedSeconds = minutes * 60 + Number(url[3]);
  if (!Number.isSafeInteger(elapsedSeconds) || elapsedSeconds < 1) invalid("Daily Set time is invalid.");
  const displayScore = duration(elapsedSeconds);
  const metrics: Record<string, unknown> = {
    completionStatus: "WIN", elapsedSeconds, gameMode: url[4] === "diablo" ? "Diablo" : "Regular",
    scoreRaw: displayScore, scoreUnit: "seconds", displayScore,
  };
  if (parts.length === 3) {
    const split = /^([🟩🟨🟥])(\d+)s ([🟩🟨🟥])(\d+)s ([🟩🟨🟥])(\d+)s ([🟩🟨🟥])(\d+)s ([🟩🟨🟥])(\d+)s ([🟩🟨🟥])(\d+)s → ⏱ ((?:0|[1-9]\d*):[0-5]\d)$/u.exec(parts[1]);
    if (!split || split[13] !== displayScore) invalid("Daily Set timing breakdown is invalid.");
    const values: number[] = [];
    for (let index = 1; index <= 11; index += 2) {
      const value = Number(split[index + 1]);
      const valid = split[index] === "🟩" ? value < 10 : split[index] === "🟨" ? value >= 10 && value <= 30 : value > 30;
      if (!Number.isSafeInteger(value) || !valid) invalid("Daily Set timing band is invalid.");
      values.push(value);
    }
    if (Math.abs(values.reduce((sum, value) => sum + value, 0) - elapsedSeconds) > 3) invalid("Daily Set timing total is invalid.");
    metrics.setTimesSeconds = values;
  }
  return { puzzleKey: `${playedOn}:${url[4]}`, playedOn, primaryScore: elapsedSeconds, metrics, parserVersion: 1 };
}

const orbColors: Record<string, string> = { "🟠": "orange", "🟢": "green", "🔵": "blue", "🟣": "purple" };
const heartColors: Record<string, string> = { "🧡": "orange", "💚": "green", "💙": "blue", "💜": "purple" };

export function dailyOrbsPreview(raw: string): ParsedSubmission {
  const parts = lines(raw);
  if (parts.length !== 3) invalid("Paste a completed winning Daily Orbs result.");
  const header = /^DailyOrbs ([A-Z][a-z]+) ([1-9]|[12]\d|3[01]) (\d{4})$/.exec(parts[0]);
  const url = /^https:\/\/dailyorbs\.com\/(\d{4}-\d{2}-\d{2})\?utm_source=share$/i.exec(parts[1]);
  if (!header || !url) invalid("Daily Orbs needs its matching dated link.");
  const playedOn = parseIsoDate(url[1]);
  const displayed = isoDate(Number(header[3]), monthNumbers[header[1]] ?? 0, Number(header[2]));
  if (displayed !== playedOn || playedOn > dateInZone("America/Toronto")) invalid("Daily Orbs puzzle date is invalid.");

  const symbols = [...parts[2].matchAll(/🟠|🟢|🔵|🟣|🧡|💚|💙|💜|🏆/gu)].map(match => match[0]);
  if (symbols.join("") !== parts[2]) invalid("Daily Orbs narrative contains an invalid symbol.");
  const orbCounts = { orange: 0, green: 0, blue: 0, purple: 0 };
  const heartCounts = { orange: 0, green: 0, blue: 0, purple: 0 };
  let orbTotal = 0;
  let trophyCount = 0;
  let trophyOrbPosition = -1;
  for (const symbol of symbols) {
    if (orbColors[symbol]) { orbTotal++; orbCounts[orbColors[symbol] as keyof typeof orbCounts]++; }
    else if (heartColors[symbol]) heartCounts[heartColors[symbol] as keyof typeof heartCounts]++;
    else { trophyCount++; trophyOrbPosition = orbTotal; }
  }
  if (orbTotal < 6 || orbTotal > 12 || trophyCount !== 1 || trophyOrbPosition !== 6 ||
      Object.values(orbCounts).some(value => value > 3) || Object.values(heartCounts).some(value => value > 3))
    invalid("Daily Orbs narrative is not a completed official win.");
  const heartLosses = Object.values(heartCounts).reduce((sum, value) => sum + value, 0);
  const metrics: Record<string, unknown> = {
    completionStatus: "WIN", orbTotal, orangeOrbs: orbCounts.orange, greenOrbs: orbCounts.green,
    blueOrbs: orbCounts.blue, purpleOrbs: orbCounts.purple, eventSequence: parts[2], gameMode: "Daily",
    heartsDisclosed: heartLosses > 0, scoreRaw: `${orbTotal}/12 orbs`, scoreUnit: "orbs",
    displayScore: `${orbTotal}/12 orbs`,
  };
  if (heartLosses > 0) Object.assign(metrics, {
    heartLosses, orangeHeartsLost: heartCounts.orange, greenHeartsLost: heartCounts.green,
    blueHeartsLost: heartCounts.blue, purpleHeartsLost: heartCounts.purple,
  });
  return { puzzleKey: playedOn, playedOn, primaryScore: orbTotal, metrics, parserVersion: 1 };
}

function minuteSymbols(row: string, current: boolean) {
  const normalized = row.replaceAll("️", "");
  const regex = current ? /🟣|🟡|⚪/gu : /🟪|🟨/gu;
  const symbols = [...normalized.matchAll(regex)].map(match => match[0]);
  if (symbols.join("") !== normalized || symbols.length < 1 || symbols.length > 64) invalid("Minute Cryptic symbol row is invalid.");
  return { hints: symbols.filter(symbol => symbol !== (current ? "🟣" : "🟪")).length };
}
function delta(under?: string, over?: string) {
  const value = under !== undefined ? Number(under) : over !== undefined ? Number(over) : 0;
  if ((under !== undefined || over !== undefined) && value === 0) invalid("Minute Cryptic par difference is invalid.");
  return under !== undefined ? -value : value;
}
function minuteTime(value: string) {
  const match = /^(?:(\d+)h)?(?: ?(\d+)m)?(?: ?(\d+)s)?$/.exec(value);
  if (!match) invalid("Minute Cryptic time is invalid.");
  const hours = Number(match[1] ?? 0), minutes = Number(match[2] ?? 0), seconds = Number(match[3] ?? 0);
  if (minutes >= 60 || seconds >= 60 || hours + minutes + seconds === 0) invalid("Minute Cryptic time is invalid.");
  return hours * 3600 + minutes * 60 + seconds;
}

export function minuteCrypticPreview(raw: string): ParsedSubmission {
  const parts = lines(raw);
  if (parts.length !== 5) invalid("Paste a complete dated Minute Cryptic result.");
  const header = /^Minute Cryptic - ([1-9]|[12]\d|3[01]) ([A-Z][a-z]+), (\d{4})$/.exec(parts[0]);
  const clue = /^(?:"(.+)"|“(.+)”) \(([1-9]\d*(?:[ ,-][1-9]\d*)*)\)$/.exec(parts[1]);
  const current = /^(🏆|🤝|🏋(?:️)?) (\d+) hints – (?:(?:(\d+) under)|matched|(?:(\d+) over)) the community par \(([1-9]\d{0,2}(?:,\d{3})*) solvers so far\)\.(?: Time: ((?:(?:\d+h)(?: \d+m)?(?: \d+s)?|(?:\d+m)(?: \d+s)?|\d+s))\.)?$/.exec(parts[3]);
  const legacy = /^I scored: (?:(?:(\d+) under)|even|(?:(\d+) over)) par$/.exec(parts[3]);
  if (!header || !clue || (!current && !legacy) || !/^https:\/\/www\.minutecryptic\.com\/?(?:\?utm_source=share)?$/.test(parts[4]))
    invalid("Minute Cryptic share is incomplete or unofficial.");
  const playedOn = isoDate(Number(header[3]), monthNumbers[header[2]] ?? 0, Number(header[1]));
  if (playedOn > new Date().toISOString().slice(0, 10)) invalid("Minute Cryptic puzzle date is invalid.");
  const symbolData = minuteSymbols(parts[2], Boolean(current));
  const hints = current ? Number(current[2]) : symbolData.hints;
  if (hints !== symbolData.hints) invalid("Minute Cryptic hint count does not match its symbols.");
  const communityParDelta = current ? delta(current[3], current[4]) : delta(legacy?.[1], legacy?.[2]);
  if (current) {
    const expected = communityParDelta < 0 ? "🏆" : communityParDelta === 0 ? "🤝" : "🏋";
    if (current[1].replaceAll("️", "") !== expected) invalid("Minute Cryptic result icon and par result disagree.");
  }
  const metrics: Record<string, unknown> = {
    completionStatus: "WIN", hints, communityParDelta,
    clue: `${clue[1] ?? clue[2]} (${clue[3]})`, symbolRow: parts[2], shareFormat: current ? "current" : "legacy",
    scoreRaw: `${hints} hints`, scoreUnit: "hints", displayScore: `${hints} hints`,
  };
  if (current) {
    metrics.solverCount = Number(current[5].replaceAll(",", ""));
    if (current[6]) metrics.completionTimeSeconds = minuteTime(current[6]);
  }
  return { puzzleKey: playedOn, playedOn, primaryScore: hints, metrics, parserVersion: 1 };
}

export function nerdlePreview(raw: string): ParsedSubmission {
  const parts = lines(raw);
  const header = /^#?(?:nerdlegame|Nerdle) ([1-9]\d*) ([1-6X])\/6$/i.exec(parts[0] ?? "");
  if (!header) invalid("Paste a complete classic Nerdle result.");
  const puzzle = Number(header[1]);
  if (!Number.isSafeInteger(puzzle) || puzzle > 100_000) invalid("Nerdle puzzle number is invalid.");
  const attempts = header[2].toUpperCase() === "X" ? 7 : Number(header[2]);
  if (parts.length !== Math.min(attempts, 6) + 1) invalid("Nerdle grid must match the score.");
  const normalizedRows = parts.slice(1).map(row => row.replaceAll("️", ""));
  if (!normalizedRows.every(row => /^(?:🟩|🟪|⬛|⬜){8}$/u.test(row))) invalid("Nerdle grid has an invalid row.");
  const won = normalizedRows.at(-1) === "🟩".repeat(8);
  if (won !== (attempts !== 7) || normalizedRows.slice(0, -1).includes("🟩".repeat(8))) invalid("Nerdle grid and score disagree.");
  const playedOn = new Date(Date.parse("2026-06-29T00:00:00Z") + (puzzle - 1622) * DAY_MS).toISOString().slice(0, 10);
  if (playedOn > new Date(Date.now() + DAY_MS).toISOString().slice(0, 10)) invalid("Nerdle puzzle appears to be in the future.");
  return { puzzleKey: String(puzzle), puzzleNumber: puzzle, playedOn, primaryScore: attempts,
    metrics: { completionStatus: won ? "WIN" : "LOSS", attemptsUsed: attempts === 7 ? 6 : attempts,
      attemptsMaximum: 6, scoreRaw: `${header[2].toUpperCase()}/6`, scoreUnit: "guesses", rows: parts.slice(1) }, parserVersion: 1 };
}

export function globlePreview(raw: string): ParsedSubmission {
  const parts = lines(raw);
  if (parts.length !== 4 && parts.length !== 5) invalid("Paste a complete dated Globle share result ending in #globle.");
  const header = /^🌎 ([A-Z][a-z]{2}) ([1-9]|[12]\d|3[01]), (\d{4}) 🌍$/.exec(parts[0]);
  if (!header || !/^🔥 \d+ \| Avg\. Guesses: \d+(?:\.\d+)?$/.test(parts[1]) || parts.at(-1)?.toLowerCase() !== "#globle")
    invalid("Paste a complete dated Globle share result ending in #globle.");
  if (parts.length === 5 && parts[3] !== "https://globle-game.com/") invalid("Globle needs its official link.");
  const score = /^([🟨🟧🟥⬜]*🟩) = ([1-9]\d*)$/u.exec(parts[2].replaceAll("️", ""));
  if (!score) invalid("Globle score grid is invalid.");
  const guesses = Number(score[2]);
  if ([...score[1]].length !== guesses) invalid("Globle grid and score disagree.");
  const playedOn = isoDate(Number(header[3]), monthNumbers[header[1]] ?? 0, Number(header[2]));
  if (playedOn > new Date(Date.now() + DAY_MS).toISOString().slice(0, 10)) invalid("Globle puzzle appears to be in the future.");
  return { puzzleKey: playedOn, playedOn, primaryScore: guesses,
    metrics: { completionStatus: "WIN", attemptsUsed: guesses, scoreRaw: parts[2], scoreUnit: "guesses", proximityGrid: score[1] }, parserVersion: 1 };
}
