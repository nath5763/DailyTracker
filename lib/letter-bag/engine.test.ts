import { describe, expect, it } from "vitest";
import {
  CONSONANT_WEIGHTS,
  createRound,
  finish,
  puzzle,
  RACK_VOWEL_TARGETS,
  submit,
  VOWEL_WEIGHTS,
} from "./engine";
describe("Letter Bag rules", () => {
  it("matches the canonical daily puzzles", () => {
    expect(puzzle("2026-11-11").map(tile => tile.letter).join("")).toBe("OVRERBTRTAEITRIESSDPFAETJTOREI");
    expect(puzzle("2026-11-12").map(tile => tile.letter).join("")).toBe("EPANKTUPOTANCOSTELONTGIUNAFVIR");
  });
  it("uses the exact category probabilities and letter weights", () => {
    expect(RACK_VOWEL_TARGETS).toEqual([5, 6, 6, 7]);
    expect(VOWEL_WEIGHTS).toEqual({ A: 8, E: 11, I: 6, O: 7, U: 3 });
    expect(CONSONANT_WEIGHTS).toEqual({
      B: 1, C: 1, D: 1, F: 1, G: 1, H: 1, J: 1, K: 1, L: 1, M: 1,
      N: 2, P: 1, Q: 1, R: 4, S: 4, T: 6, V: 1, W: 1, Y: 1, Z: 1,
    });
    expect(Object.values(VOWEL_WEIGHTS).reduce((sum, weight) => sum + weight, 0)).toBe(35);
    expect(Object.values(CONSONANT_WEIGHTS).reduce((sum, weight) => sum + weight, 0)).toBe(32);
    expect(CONSONANT_WEIGHTS).toHaveProperty("Y", 1);
    expect(CONSONANT_WEIGHTS).not.toHaveProperty("X");
  });
  it("keeps twelve vowels across balanced rack and bag halves", () => {
    const openingCounts = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const tiles = puzzle(`balance-${i}`);
      const rackVowels = tiles.slice(0, 15).filter(tile => "AEIOU".includes(tile.letter)).length;
      const bagVowels = tiles.slice(15).filter(tile => "AEIOU".includes(tile.letter)).length;
      expect(tiles).toHaveLength(30);
      expect(rackVowels + bagVowels).toBe(12);
      expect(rackVowels).toBeGreaterThanOrEqual(5);
      expect(rackVowels).toBeLessThanOrEqual(7);
      expect(bagVowels).toBe(12 - rackVowels);
      openingCounts.add(rackVowels);
    }
    expect([...openingCounts].sort()).toEqual([5, 6, 7]);
  });
  it("does not consume letters for an invalid word", () => {
    const round = { ...createRound("2026-11-11"), startedAt: 1000 };
    const result = submit(round, [1, 3, 4], 1000);
    expect(result.error).toBe("Not in the word list");
    expect(result.round).toEqual(round);
  });
  it("keeps a daily round open after 90 seconds and lets the player finish it", () => {
    const round = { ...createRound("2026-11-11"), startedAt: 1_000 };
    const later = submit(round, [1, 3, 4], 1_000_000);
    expect(later.round.endedAt).toBeNull();
    expect(finish(round, 1_000_000).endedAt).toBe(1_000_000);
    expect(finish(finish(round, 1_000_000), 2_000_000).endedAt).toBe(1_000_000);
  });
  it("awards each rare-letter bonus and ends only when letters are exhausted", () => {
    const round = { ...createRound("2026-11-11"), startedAt: 1_000,
      rack: [{ id: 0, letter: "J" }, { id: 1, letter: "A" }, { id: 2, letter: "Z" }, { id: 3, letter: "Z" }], bag: [] };
    const played = submit(round, [0, 1, 2, 3], 1_000_000);
    expect(played.error).toBeUndefined();
    expect(played.round.words).toEqual([{ word: "jazz", points: 16 }]);
    expect(played.round.score).toBe(16);
    expect(played.round.endedAt).toBe(1_000_000);
  });
});
