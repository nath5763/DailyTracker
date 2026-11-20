import { WORDS } from "./words";
import { wordScore } from "./scoring";

export type Tile = { id: number; letter: string };
export type Word = { word: string; points: number };
export type Round = { date: string; rack: Tile[]; bag: Tile[]; words: Word[]; score: number; startedAt: number | null; endedAt: number | null };
export const VOWEL_WEIGHTS = { A: 8, E: 11, I: 6, O: 7, U: 3 } as const;
export const CONSONANT_WEIGHTS = {
  B: 1, C: 1, D: 1, F: 1, G: 1, H: 1, J: 1, K: 1, L: 1, M: 1,
  N: 2, P: 1, Q: 1, R: 4, S: 4, T: 6, V: 1, W: 1, Y: 1, Z: 1,
} as const;
export const RACK_VOWEL_TARGETS = [5, 6, 6, 7] as const;

const weightedPool = (weights: Readonly<Record<string, number>>) =>
  Object.entries(weights).map(([letter, weight]) => letter.repeat(weight)).join("");
const VOWEL_POOL = weightedPool(VOWEL_WEIGHTS);
const CONSONANT_POOL = weightedPool(CONSONANT_WEIGHTS);
function random(seed: string) {
  let h = 2166136261;
  for (const char of seed) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  let state = h >>> 0 || 1;
  return () => { state += 0x6d2b79f5; let t = state; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function puzzle(date: string): Tile[] {
  const rng = random(date);
  const totalVowels = 12;
  const draw = (pool: string) => pool[Math.floor(rng() * pool.length)];
  const shuffle = (letters: string[]) => {
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    return letters;
  };

  const rackVowels = RACK_VOWEL_TARGETS[Math.floor(rng() * RACK_VOWEL_TARGETS.length)];
  const bagVowels = totalVowels - rackVowels;

  const rack = shuffle([
    ...Array.from({ length: rackVowels }, () => draw(VOWEL_POOL)),
    ...Array.from({ length: 15 - rackVowels }, () => draw(CONSONANT_POOL)),
  ]);
  const bag = shuffle([
    ...Array.from({ length: bagVowels }, () => draw(VOWEL_POOL)),
    ...Array.from({ length: 15 - bagVowels }, () => draw(CONSONANT_POOL)),
  ]);
  const letters = [...rack, ...bag];
  return letters.map((letter, id) => ({ id, letter }));
}
export function createRound(date: string): Round { const tiles = puzzle(date); return { date, rack: tiles.slice(0, 15), bag: tiles.slice(15), words: [], score: 0, startedAt: null, endedAt: null }; }
export function finish(round: Round, now = Date.now()): Round { return round.startedAt !== null && round.endedAt === null ? { ...round, endedAt: now } : round; }
export function submit(round: Round, ids: number[], now = Date.now()): { round: Round; error?: string } {
  if (round.startedAt === null || round.endedAt !== null) return { round, error: "Round has ended" };
  if (ids.length < 3 || new Set(ids).size !== ids.length) return { round, error: "Select at least three different tiles" };
  const chosen = ids.map(id => round.rack.find(tile => tile.id === id));
  if (chosen.some(tile => !tile)) return { round, error: "Those tiles are no longer in the rack" };
  const word = chosen.map(tile => tile!.letter).join("").toLowerCase();
  if (round.words.some(entry => entry.word === word)) return { round, error: "Already played" };
  if (!WORDS.has(word)) return { round, error: "Not in the word list" };
  const points = wordScore(word).total;
  const drawn = round.bag.slice(0, ids.length);
  const rack = [...round.rack.filter(tile => !ids.includes(tile.id)), ...drawn].sort((a,b) => a.id - b.id);
  const next = { ...round, rack, bag: round.bag.slice(drawn.length), words: [...round.words, { word, points }], score: round.score + points };
  return { round: rack.length < 3 ? finish(next, now) : next };
}
