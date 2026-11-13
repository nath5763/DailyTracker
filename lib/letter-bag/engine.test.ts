import { describe, expect, it } from "vitest";
import { createRound, finish, puzzle, submit } from "./engine";
describe("Letter Bag rules", () => {
  it("matches the Reddit game's balanced daily puzzles", () => {
    expect(puzzle("2026-11-11").map(tile => tile.letter).join("")).toBe("ERERRAOTORITNTRSAPDJTMOATIORAN");
    expect(puzzle("2026-11-12").map(tile => tile.letter).join("")).toBe("SONZKEANTPICOPREANTIIFRILOWATN");
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
