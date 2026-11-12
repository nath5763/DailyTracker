import { WORDS } from "./words";

export type Tile = { id: number; letter: string };
export type Word = { word: string; points: number };
export type Round = { date: string; rack: Tile[]; bag: Tile[]; words: Word[]; score: number; startedAt: number | null; endedAt: number | null };
const LETTERS = "AAAAAAAABCDEEEEEEEEEEEFGHIIIIIIJKLMNNOOOOOOOPQRRRRSSSSTTTTTTUUUVWYZ";
function random(seed: string) {
  let h = 2166136261;
  for (const char of seed) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  let state = h >>> 0 || 1;
  return () => { state += 0x6d2b79f5; let t = state; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function puzzle(date: string): Tile[] {
  const rng = random(date);
  const letters = Array.from({ length: 30 }, () => LETTERS[Math.floor(rng() * LETTERS.length)]);
  const anchors = ["CAT", "DOG", "SUN", "EAR", "NOTE", "STAR", "RAIN", "FIRE", "GAME", "LAMP"];
  const playable = anchors.filter(word => WORDS.has(word.toLowerCase()));
  const anchor = playable[Math.floor(rng() * playable.length)] || "CAT";
  for (let i = 0; i < anchor.length; i++) letters[i] = anchor[i];
  let vowels = letters.slice(0, 15).filter(ch => "AEIOU".includes(ch)).length;
  for (let i = anchor.length; i < 15 && vowels < 3; i++) if (!"AEIOU".includes(letters[i])) { letters[i] = "AEIOU"[Math.floor(rng() * 5)]; vowels++; }
  for (let i = 14; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [letters[i], letters[j]] = [letters[j], letters[i]]; }
  return letters.map((letter, id) => ({ id, letter }));
}
export function createRound(date: string): Round { const tiles = puzzle(date); return { date, rack: tiles.slice(0, 15), bag: tiles.slice(15), words: [], score: 0, startedAt: null, endedAt: null }; }
export function remaining(round: Round, now = Date.now()) { return round.startedAt === null ? 90 : Math.max(0, Math.ceil((round.startedAt + 90000 - now) / 1000)); }
export function finish(round: Round, now = Date.now()): Round { return round.endedAt === null ? { ...round, endedAt: Math.min(now, (round.startedAt ?? now) + 90000) } : round; }
export function submit(round: Round, ids: number[], now = Date.now()): { round: Round; error?: string } {
  if (round.startedAt === null || round.endedAt !== null || remaining(round, now) === 0) return { round: finish(round, now), error: "Round has ended" };
  if (ids.length < 3 || new Set(ids).size !== ids.length) return { round, error: "Select at least three different tiles" };
  const chosen = ids.map(id => round.rack.find(tile => tile.id === id));
  if (chosen.some(tile => !tile)) return { round, error: "Those tiles are no longer in the rack" };
  const word = chosen.map(tile => tile!.letter).join("").toLowerCase();
  if (round.words.some(entry => entry.word === word)) return { round, error: "Already played" };
  if (!WORDS.has(word)) return { round, error: "Not in the word list" };
  const points = 1 + ids.length * (ids.length + 1) / 2;
  const drawn = round.bag.slice(0, ids.length);
  const rack = [...round.rack.filter(tile => !ids.includes(tile.id)), ...drawn].sort((a,b) => a.id - b.id);
  const next = { ...round, rack, bag: round.bag.slice(drawn.length), words: [...round.words, { word, points }], score: round.score + points };
  return { round: rack.length < 3 ? finish(next, now) : next };
}
