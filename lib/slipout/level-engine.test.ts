import { describe, expect, it } from "vitest";
import catalog from "./levels.json";
import { applyLevelMove, levelRange, solveLevel, validLevel, type Level } from "./level-engine";

const levels = catalog as Level[];
describe("SlipOut level catalog", () => {
  it("has 15 fixed, valid levels with verified difficulty tiers", () => {
    expect(levels).toHaveLength(15);
    for (const [index, level] of levels.entries()) {
      expect(level.number).toBe(index + 1);
      expect(level.id).toBe(`slipout-level-v1-${String(index + 1).padStart(2, "0")}`);
      expect(validLevel(level)).toBe(true);
      expect(solveLevel(level), level.id).toBe(level.optimalMoves);
      expect(level.difficulty).toBe(index < 5 ? "easy" : index < 10 ? "medium" : "hard");
      expect(level.optimalMoves).toBeGreaterThanOrEqual(index < 5 ? 6 : index < 10 ? 13 : 20);
      if (index < 10) expect(level.optimalMoves).toBeLessThanOrEqual(index < 5 ? 12 : 19);
    }
    expect(new Set(levels.map(({ blocks }) => `${blocks[0].width}x${blocks[0].height}`)))
      .toEqual(new Set(["1x1", "1x2", "2x1", "2x2"]));
  }, 20_000);
  it("moves a rectangular target on both axes and exits only when aligned", () => {
    const blocks = [{ id: "X", x: 0, y: 1, width: 2, height: 2, axis: "B" as const }];
    expect(levelRange(blocks, "X", "H")[1]).toBe(4);
    const down = applyLevelMove(blocks, { id: "X", axis: "V", to: 2 });
    expect(down.blocks[0].y).toBe(2);
    expect(levelRange(down.blocks, "X", "H")[1]).toBe(6);
    expect(applyLevelMove(down.blocks, { id: "X", axis: "H", to: 6 }).exited).toBe(true);
  });
});
