import { puzzle, type Tile, type Word } from "./engine";
import { WORDS } from "./words";

export type VariantMode = "untimed" | "endless";
export type VariantRound = {
  mode: VariantMode;
  seed: string;
  rack: Tile[];
  bag: Tile[];
  nextId: number;
  words: Word[];
  score: number;
  startedAt: number | null;
  endedAt: number | null;
};

export function createVariantRound(mode: VariantMode, seed: string): VariantRound {
  const tiles = puzzle(seed);
  return {
    mode, seed, rack: tiles.slice(0, 15), bag: tiles.slice(15), nextId: 30,
    words: [], score: 0, startedAt: null, endedAt: null,
  };
}

export function startVariant(round: VariantRound, now = Date.now()): VariantRound {
  return round.startedAt === null ? { ...round, startedAt: now } : round;
}

export function variantTimeLeft(round: VariantRound, now = Date.now()): number | null {
  if (round.mode === "untimed") return null;
  if (round.startedAt === null) return 90;
  return Math.max(0, Math.ceil((round.startedAt + 90_000 - now) / 1000));
}

export function finishVariant(round: VariantRound, now = Date.now()): VariantRound {
  if (round.endedAt !== null) return round;
  const deadline = round.mode === "endless" && round.startedAt !== null ? round.startedAt + 90_000 : now;
  return { ...round, endedAt: Math.min(now, deadline) };
}

function refill(round: VariantRound, bag: Tile[], nextId: number) {
  if (round.mode === "untimed") return { bag, nextId };
  const filled = [...bag];
  while (filled.length < 15) {
    const batch = Math.floor((nextId - 30) / 30) + 1;
    const offset = (nextId - 30) % 30;
    const source = puzzle(`${round.seed}:refill:${batch}`);
    const count = Math.min(15 - filled.length, 30 - offset);
    for (let i = 0; i < count; i++) filled.push({ id: nextId + i, letter: source[offset + i].letter });
    nextId += count;
  }
  return { bag: filled, nextId };
}

export function submitVariant(round: VariantRound, ids: number[], now = Date.now()): { round: VariantRound; error?: string } {
  if (round.startedAt === null || round.endedAt !== null || variantTimeLeft(round, now) === 0) {
    return { round: round.startedAt === null ? round : finishVariant(round, now), error: "Round has ended" };
  }
  if (ids.length < 3 || new Set(ids).size !== ids.length) return { round, error: "Select at least three different tiles" };
  const chosen = ids.map(id => round.rack.find(tile => tile.id === id));
  if (chosen.some(tile => !tile)) return { round, error: "Those tiles are no longer in the rack" };
  const word = chosen.map(tile => tile!.letter).join("").toLowerCase();
  if (round.words.some(entry => entry.word === word)) return { round, error: "Already played" };
  if (!WORDS.has(word)) return { round, error: "Not in the word list" };

  const points = 1 + ids.length * (ids.length + 1) / 2;
  const drawn = round.bag.slice(0, ids.length);
  const rack = [...round.rack.filter(tile => !ids.includes(tile.id)), ...drawn].sort((a, b) => a.id - b.id);
  const remainingBag = refill(round, round.bag.slice(drawn.length), round.nextId);
  const next = {
    ...round, rack, ...remainingBag,
    words: [...round.words, { word, points }], score: round.score + points,
  };
  return { round: rack.length < 3 ? finishVariant(next, now) : next };
}
