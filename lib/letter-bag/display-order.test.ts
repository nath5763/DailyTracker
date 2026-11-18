import { describe, expect, it } from "vitest";
import {
  reconcileTileDisplayOrder,
  shuffleTileDisplayOrder,
  tilesInDisplayOrder,
} from "./display-order";

describe("Letter Bag tile display order", () => {
  it("shuffles into a new order without changing or duplicating tile IDs", () => {
    const tileIds = [10, 11, 12, 13, 14];
    const original = [...tileIds];
    const shuffled = shuffleTileDisplayOrder(tileIds, () => 0.999);

    expect(tileIds).toEqual(original);
    expect(shuffled).not.toBe(tileIds);
    expect(shuffled).not.toEqual(tileIds);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(original);
    expect(new Set(shuffled).size).toBe(tileIds.length);
  });

  it("keeps surviving tiles in their display order and appends replacements", () => {
    const displayOrder = [14, 11, 13, 10, 12];
    const nextRack = [{ id: 10 }, { id: 12 }, { id: 13 }, { id: 15 }, { id: 16 }];

    expect(reconcileTileDisplayOrder(displayOrder, nextRack)).toEqual([13, 10, 12, 15, 16]);
  });

  it("keeps the selected word in selection order after the rack is shuffled", () => {
    const rack = [
      { id: 1, letter: "C" },
      { id: 2, letter: "A" },
      { id: 3, letter: "T" },
      { id: 4, letter: "S" },
    ];
    const selectedIds = [1, 2, 3];
    const displayOrder = shuffleTileDisplayOrder(rack.map(tile => tile.id), () => 0);
    const displayedRack = tilesInDisplayOrder(rack, displayOrder);
    const selectedWord = selectedIds
      .map(id => displayedRack.find(tile => tile.id === id)!.letter)
      .join("");

    expect(selectedWord).toBe("CAT");
  });
});
