import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SlipOutLevels } from "@/components/slipout-levels";
import catalog from "./levels.json";
import { applyLevelMove, initialLevelState, levelRange, solveLevel, solveLevelPath, validLevel, type Level } from "./level-engine";

const levels = catalog as Level[];
const simple = (side: Level["exit"]["side"], cell: number, x: number, y: number, axis: "H" | "V" = "H"): Level => ({
  id: "test", number: 1, difficulty: "easy", optimalMoves: 1, startAxis: axis, exit: { side, cell },
  switches: [{ x: 2, y: 2 }], blocks: [{ id: "X", x, y, width: 1, height: 1, axis: "B" }]
});

describe("SlipOut level catalog", () => {
  it("hides blocks and switches until Start while marking the exit", () => {
    const html = renderToStaticMarkup(createElement(SlipOutLevels, { signedIn: false }));
    expect(html).not.toContain('class="so-block ');
    expect(html).not.toContain('class="so-switch');
    expect(html).toContain("so-level-exit");
  });
  it("has 15 fixed, solvable levels in three tiers", () => {
    expect(levels).toHaveLength(15);
    for (const [index, level] of levels.entries()) {
      expect(level.number).toBe(index + 1);
      expect(level.id).toBe(`slipout-level-v2-${String(index + 1).padStart(2, "0")}`);
      expect(validLevel(level), level.id).toBe(true);
      expect(solveLevel(level), level.id).toBe(level.optimalMoves);
      expect(level.difficulty).toBe(index < 5 ? "easy" : index < 10 ? "medium" : "hard");
      expect(level.optimalMoves).toBeGreaterThanOrEqual(index < 5 ? 6 : index < 10 ? 13 : 20);
      if (index < 10) expect(level.optimalMoves).toBeLessThanOrEqual(index < 5 ? 12 : 19);
    }
    expect(new Set(levels.map(({ blocks }) => `${blocks[0].width}x${blocks[0].height}`)))
      .toEqual(new Set(["1x1", "1x2", "2x1"]));
    expect(new Set(levels.map(level => level.exit.side)))
      .toEqual(new Set(["left", "right", "top", "bottom"]));
  }, 120_000);

  it("toggles only when newly landing on a switch and permits re-entry", () => {
    const level = simple("top", 2, 0, 2);
    let state = initialLevelState(level);
    state = applyLevelMove(level, state, { id: "X", axis: "H", to: 4 }).state;
    expect(state.activeAxis).toBe("H"); // Crossed the switch.
    state = applyLevelMove(level, state, { id: "X", axis: "H", to: 2 }).state;
    expect(state.activeAxis).toBe("V");
    state = applyLevelMove(level, state, { id: "X", axis: "V", to: 3 }).state;
    expect(state.activeAxis).toBe("V");
    state = applyLevelMove(level, state, { id: "X", axis: "V", to: 2 }).state;
    expect(state.activeAxis).toBe("H");
  });

  it("uses newly covered cells of a two-cell target and toggles once", () => {
    const level: Level = { ...simple("right", 2, 1, 2), startAxis: "H",
      switches: [{ x: 2, y: 2 }, { x: 3, y: 2 }],
      blocks: [{ id: "X", x: 1, y: 2, width: 2, height: 1, axis: "B" }] };
    let state = initialLevelState(level);
    state = applyLevelMove(level, state, { id: "X", axis: "H", to: 2 }).state;
    expect(state.activeAxis).toBe("V"); // Cell 3 is new, cell 2 was already covered.
    expect(() => levelRange(level, state, "X", "H")).toThrow();
  });

  it.each([
    ["left", 0, 3, 0, "H", -1],
    ["right", 1, 1, 1, "H", 6],
    ["top", 3, 3, 4, "V", -1],
    ["bottom", 4, 4, 1, "V", 6]
  ] as const)("exits through the %s opening", (side, cell, x, y, axis, to) => {
    const level = simple(side, cell, x, y, axis);
    expect(applyLevelMove(level, initialLevelState(level), { id: "X", axis, to }).exited).toBe(true);
  });

  it("rejects the wrong side, misalignment, axis, and two-cell-wide end", () => {
    const level = simple("right", 2, 0, 1);
    expect(() => applyLevelMove(level, initialLevelState(level), { id: "X", axis: "H", to: 6 })).toThrow();
    expect(() => applyLevelMove(level, initialLevelState(level), { id: "X", axis: "V", to: 2 })).toThrow();
    const tall: Level = { ...simple("right", 2, 0, 2, "V"),
      blocks: [{ id: "X", x: 0, y: 2, width: 1, height: 2, axis: "B" }] };
    expect(() => applyLevelMove(tall, initialLevelState(tall), { id: "X", axis: "H", to: 6 })).toThrow();
  });

  it("returns a replayable shortest path", () => {
    const level = simple("top", 2, 0, 2);
    const path = solveLevelPath(level)!;
    let state = initialLevelState(level), exited = false;
    for (const move of path) ({ state, exited } = applyLevelMove(level, state, move));
    expect(exited).toBe(true);
    expect(path.length).toBe(solveLevel(level));
  });
});
