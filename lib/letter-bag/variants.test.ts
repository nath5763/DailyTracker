import { describe, expect, it } from "vitest";
import { createVariantRound, startVariant, submitVariant, variantTimeLeft } from "./variants";
import { puzzle } from "./engine";
import { WORDS } from "./words";

function playableIds(rack: { id: number; letter: string }[]) {
  for (const candidate of WORDS) {
    if (candidate.length < 3 || candidate.length > rack.length) continue;
    const word = candidate.toUpperCase();
    const available = [...rack];
    const ids = [...word].map(letter => {
      const index = available.findIndex(tile => tile.letter === letter);
      return index < 0 ? -1 : available.splice(index, 1)[0].id;
    });
    if (ids.every(id => id >= 0)) return ids;
  }
  throw new Error("Opening rack has no playable word");
}

describe("Letter Bag variants", () => {
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
