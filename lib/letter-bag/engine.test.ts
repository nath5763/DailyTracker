import { describe, expect, it } from "vitest";
import { createRound, puzzle, submit } from "./engine";
describe("Letter Bag rules", () => {
  it("matches the original daily puzzle", () => {
    expect(puzzle("2026-11-11").map(tile => tile.letter).join("")).toBe("GRNQSKODOTNUDMMAEOQJAETTIOSTBA");
  });
  it("does not consume letters for an invalid word", () => {
    const round = { ...createRound("2026-11-11"), startedAt: 1000 };
    const result = submit(round, [0, 1, 2], 1000);
    expect(result.error).toBe("Not in the word list");
    expect(result.round).toEqual(round);
  });
});
