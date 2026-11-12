import { describe, expect, it } from "vitest";
import { createVariantRound, startVariant, submitVariant, variantTimeLeft } from "./variants";
import { puzzle } from "./engine";

function playableIds(rack: { id: number; letter: string }[]) {
  for (const word of ["CAT", "DOG", "SUN", "EAR", "NOTE", "STAR", "RAIN", "FIRE", "GAME", "LAMP"]) {
    const available = [...rack];
    const ids = [...word].map(letter => {
      const index = available.findIndex(tile => tile.letter === letter);
      return index < 0 ? -1 : available.splice(index, 1)[0].id;
    });
    if (ids.every(id => id >= 0)) return ids;
  }
  throw new Error("Opening rack has no anchor word");
}

describe("Letter Bag variants", () => {
  it("lets a thirty-letter round continue without a clock and end when tiles run out", () => {
    const waiting = createVariantRound("untimed", "finite");
    const round = startVariant(waiting, 1_000);
    expect(variantTimeLeft(round, 1_000_000)).toBeNull();
    const ids = playableIds(round.rack);
    const result = submitVariant(round, ids, 1_000_000);
    expect(result.error).toBeUndefined();
    expect(result.round.rack).toHaveLength(15);
    expect(result.round.bag).toHaveLength(15 - ids.length);
    expect(result.round.score).toBe(1 + ids.length * (ids.length + 1) / 2);

    const lastTiles = { ...round, rack: [{ id: 0, letter: "C" }, { id: 1, letter: "A" }, { id: 2, letter: "T" }], bag: [] };
    expect(submitVariant(lastTiles, [0, 1, 2], 1_000_000).round.endedAt).toBe(1_000_000);
  });

  it("replenishes the timed round and preview from a continuing draw sequence", () => {
    const round = startVariant(createVariantRound("endless", "continuous"), 1_000);
    const ids = playableIds(round.rack);
    const result = submitVariant(round, ids, 2_000);
    expect(result.error).toBeUndefined();
    expect(result.round.rack).toHaveLength(15);
    expect(result.round.bag).toHaveLength(15);
    expect(result.round.nextId).toBe(30 + ids.length);
    expect(result.round.bag.slice(-ids.length).map(tile => tile.letter)).toEqual(
      puzzle("continuous:refill:1").slice(0, ids.length).map(tile => tile.letter),
    );
    expect(result.round.bag.slice(-ids.length).map(tile => tile.id)).toEqual(
      Array.from({ length: ids.length }, (_, index) => 30 + index),
    );
    expect(variantTimeLeft(round, 91_000)).toBe(0);
    expect(submitVariant(round, ids, 91_000).round.endedAt).toBe(91_000);
  });

  it("keeps tiles and score when a word is invalid", () => {
    const round = startVariant(createVariantRound("endless", "invalid"), 1_000);
    const result = submitVariant(round, [0, 0, 1], 2_000);
    expect(result.error).toBe("Select at least three different tiles");
    expect(result.round).toEqual(round);
  });
});
