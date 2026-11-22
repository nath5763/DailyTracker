import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { execFileSync } from "node:child_process";
import { SlipOutLevels } from "@/components/slipout-levels";
import catalog from "./levels.json";
import { applyLevelMove, initialLevelState, levelRange, replayLevelMoves, solveLevel, solveLevelPath, validLevel, type Level } from "./level-engine";

const levels = catalog as Level[];
const retainedBoards = new Set([1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 13, 14, 15,
  16, 17, 18, 19, 31, 32, 33, 34, 61, 62, 63, 64, 65, 68, 76, 79]);
const simple = (side: Level["exit"]["side"], cell: number, x: number, y: number, axis: "H" | "V" = "H"): Level => ({
  id: "test", number: 1, difficulty: "easy", optimalMoves: 1, startAxis: axis, exit: { side, cell },
  switches: [{ x: 2, y: 2 }], blocks: [{ id: "X", x, y, width: 1, height: 1, axis: "B" }]
});

describe("SlipOut level catalog", () => {
  it("shows a playable level board with Restart and no Start button", () => {
    const html = renderToStaticMarkup(createElement(SlipOutLevels, { signedIn: false, mode: "tutorial" }));
    expect(html).toContain("HOW TO PLAY");
    expect(html).toContain('class="so-block ');
    expect(html).toContain('class="so-switch');
    expect(html).toContain("so-level-exit");
    expect(html).toContain(">Restart</button>");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Undo<\/button>/);
    expect(html).not.toContain("Start tutorial");
    const target = html.match(/<div[^>]*class="so-block so-target[^"]*"[^>]*>/)?.[0];
    expect(target).toBeDefined();
    expect(target).toContain('aria-disabled="false"');
    expect(html).not.toMatch(/<button[^>]*class="so-block/);
  });
  it("opens Levels on the campaign selector without rendering a puzzle board", () => {
    const html = renderToStaticMarkup(createElement(SlipOutLevels, { signedIn: false, mode: "levels" }));
    expect(html).toContain("90 LEVELS");
    expect(html).toContain("so-difficulty-tabs");
    expect(html).toContain("Continue playing");
    expect(html).toContain("so-level-list");
    expect(html).toContain("easy");
    expect(html).toContain("medium");
    expect(html).toContain("hard");
    expect(html).not.toContain('class="so-board"');
    expect(html).not.toContain("Restart</button>");
    expect(html).not.toContain("Replay tutorial");
  });
  it("has an obstacle-free tutorial and 30 solvable levels per difficulty", () => {
    expect(levels).toHaveLength(91);
    expect(levels[0]).toMatchObject({ number: 0, difficulty: "tutorial", optimalMoves: 2 });
    expect(levels[0].blocks).toHaveLength(1);
    expect(solveLevel(levels[0])).toBe(2);
    for (const [index, level] of levels.slice(1).entries()) {
      expect(level.number).toBe(index + 1);
      expect(level.id).toBe(`slipout-level-v${retainedBoards.has(level.number) ? index < 15 ? 3 : index < 60 ? 4 : 5 : 6}-${String(index + 1).padStart(2, "0")}`);
      expect(validLevel(level), level.id).toBe(true);
      const shortest = solveLevelPath(level);
      expect(shortest?.length, level.id).toBe(level.optimalMoves);
      const difficulty = index < 15 ? index < 5 ? "easy" : index < 10 ? "medium" : "hard" :
        index < 60 ? index < 30 ? "easy" : index < 45 ? "medium" : "hard" :
          index < 70 ? "easy" : index < 80 ? "medium" : "hard";
      expect(level.difficulty).toBe(difficulty);
      expect(level.optimalMoves).toBeGreaterThanOrEqual(difficulty === "easy" ? 6 : difficulty === "medium" ? 13 : 20);
      if (difficulty !== "hard") expect(level.optimalMoves).toBeLessThanOrEqual(difficulty === "easy" ? 12 : 19);
      if (index >= 15) {
        const moved = new Set(shortest?.filter(move => move.id !== "X").map(move => move.id));
        const threshold = difficulty === "easy" ? .5 : difficulty === "medium" ? .75 : .9;
        expect(moved.size, level.id).toBeGreaterThanOrEqual(Math.ceil((level.blocks.length - 1) * threshold));
        if (index >= 60) {
          const obstacleMoves = shortest!.filter(move => move.id !== "X").length;
          expect(obstacleMoves / shortest!.length, level.id).toBeGreaterThanOrEqual(.6);
          let state = initialLevelState(level), changes = 0;
          for (const move of shortest!) {
            const next = applyLevelMove(level, state, move).state;
            if (next.activeAxis !== state.activeAxis) changes++;
            state = next;
          }
          expect(changes, level.id).toBeGreaterThanOrEqual(1);
          expect(changes, level.id).toBeLessThanOrEqual(3);
        }
      }
    }
    for (const difficulty of ["easy", "medium", "hard"] as const)
      expect(levels.filter(level => level.difficulty === difficulty)).toHaveLength(30);
    expect(new Set(levels.map(({ blocks }) => `${blocks[0].width}x${blocks[0].height}`)))
      .toEqual(new Set(["1x1", "1x2", "2x1"]));
    expect(new Set(levels.map(level => level.exit.side)))
      .toEqual(new Set(["left", "right", "top", "bottom"]));
  }, 600_000);

  it("has no equivalent or near-identical board layouts across difficulties", () => {
    expect(() => execFileSync(process.execPath, ["tools/audit-slipout-diversity.mjs", "--check"],
      { encoding: "utf8" })).not.toThrow();
  });

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

  it("replays remaining moves to restore positions and the previous active axis", () => {
    const level = simple("top", 2, 0, 2);
    const moves = [
      { id: "X", axis: "H" as const, to: 2 },
      { id: "X", axis: "V" as const, to: 3 }
    ];
    const played = replayLevelMoves(level, moves);
    expect(played).toMatchObject({ activeAxis: "V", blocks: [{ id: "X", x: 2, y: 3 }] });
    const once = replayLevelMoves(level, moves.slice(0, -1));
    expect(once).toMatchObject({ activeAxis: "V", blocks: [{ id: "X", x: 2, y: 2 }] });
    const twice = replayLevelMoves(level, []);
    expect(twice).toEqual(initialLevelState(level));
    expect(played.blocks[0]).toMatchObject({ x: 2, y: 3 });
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
