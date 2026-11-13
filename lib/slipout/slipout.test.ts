import { describe, expect, it } from "vitest";
import { applyMove, reachableRange } from "./movement";
import { loadBest, saveAttempt, saveBest } from "./persistence";
import { puzzleForDate } from "./puzzles";
import { compareResults, resultFromSession, type SlipOutResult } from "./results";
import { expireSession, moveSession, readySession, startSession } from "./session";
import { solve } from "./solver";
import type { Board } from "./model";

const board: Board = [
  { id: "X", x: 0, y: 2, length: 2, axis: "H" },
  { id: "A", x: 2, y: 0, length: 2, axis: "V" },
  { id: "B", x: 2, y: 3, length: 2, axis: "H" },
];
const puzzle = { id: "slipout-v1-2026-11-13", date: "2026-11-13", number: 1, blocks: board, optimalMoves: 2 };

describe("SlipOut movement", () => {
  it("slides horizontal and vertical blocks only along their axes", () => {
    expect(applyMove(board, { id: "B", to: 1 }).blocks[2]).toMatchObject({ x: 1, y: 3 });
    expect(applyMove(board, { id: "A", to: 1 }).blocks[1]).toMatchObject({ x: 2, y: 1 });
  });
  it("detects collisions and board boundaries", () => {
    expect(reachableRange(board, "X")).toEqual([0, 6]);
    expect(() => applyMove(board, { id: "A", to: 2 })).toThrow("Blocked move");
    expect(() => applyMove(board, { id: "B", to: -1 })).toThrow("Blocked move");
    expect(() => applyMove(board, { id: "B", to: 5 })).toThrow("Blocked move");
    expect(() => applyMove(board, { id: "B", to: 6 })).toThrow("Blocked move");
  });
  it("counts a multi-cell slide once and ignores a no-op", () => {
    const started = startSession(readySession(puzzle), 1000);
    const same = moveSession(started, { id: "B", to: 2 }, 1200);
    expect(same).toBe(started);
    const moved = moveSession(started, { id: "B", to: 4 }, 1300);
    expect(moved.history).toEqual([{ id: "B", to: 4 }]);
    expect(moveSession(moved, { id: "B", to: 2 }, 1400).history).toHaveLength(2);
  });
  it("completes only when the target exits on the right", () => {
    const within = applyMove(board, { id: "X", to: 4 });
    expect(within.exited).toBe(false);
    expect(applyMove(within.blocks, { id: "X", to: 6 }).exited).toBe(true);
    const complete = moveSession(startSession(readySession(puzzle), 0), { id: "X", to: 6 }, 1200);
    expect(complete.status).toBe("COMPLETED");
    expect(complete.history).toHaveLength(1);
    expect(moveSession(complete, { id: "A", to: 1 }, 1300)).toBe(complete);
  });
});

describe("SlipOut daily puzzles", () => {
  it("selects the same board and identity for the same UTC date", () => {
    expect(puzzleForDate("2026-11-13")).toEqual(puzzleForDate("2026-11-13"));
    expect(puzzleForDate("2026-11-13").id).toBe("slipout-v1-2026-11-13");
  });
  it("validates all eight templates with a shortest-path solver", () => {
    for (let offset = 0; offset < 8; offset++) {
      const date = new Date(Date.UTC(2026, 10, 13 + offset)).toISOString().slice(0, 10);
      const daily = puzzleForDate(date);
      const solution = solve(daily.blocks);
      expect(solution, date).not.toBeNull();
      expect(solution!.moves.length, date).toBe(daily.optimalMoves);
      expect(solution!.moves.length, date).toBeGreaterThanOrEqual(8);
      expect(solution!.moves.length, date).toBeLessThanOrEqual(20);
    }
  });
});

describe("SlipOut timing, results, and retries", () => {
  it("expires at 90 seconds and rejects a completion exactly at the limit", () => {
    const started = startSession(readySession(puzzle), 1000);
    expect(expireSession(started, 90_999).status).toBe("PLAYING");
    expect(moveSession(started, { id: "X", to: 6 }, 91_000).status).toBe("TIME_EXPIRED");
    expect(moveSession(started, { id: "X", to: 6 }, 90_999).status).toBe("COMPLETED");
  });
  it("resets the board, count, and timer for another attempt", () => {
    const played = moveSession(startSession(readySession(puzzle), 1000), { id: "B", to: 4 }, 2000);
    expect(readySession(puzzle)).toEqual({ status: "READY", blocks: puzzle.blocks, history: [], startedAt: null, endedAt: null });
    expect(played.history).toHaveLength(1);
  });
  it("ranks completed attempts by moves, then milliseconds, ahead of failures", () => {
    const base: SlipOutResult = { puzzleId: puzzle.id, puzzleDate: puzzle.date, playerId: null,
      completed: true, moves: 12, completionTimeMs: 42_000, remainingTimeMs: 48_000, completedAt: "2026-11-13T00:00:42Z" };
    const faster = { ...base, completionTimeMs: 35_000 };
    const fewer = { ...base, moves: 11, completionTimeMs: 80_000 };
    const failed = { ...base, completed: false, moves: 1, completionTimeMs: null };
    expect([base, fewer, faster, failed].sort(compareResults)).toEqual([fewer, faster, base, failed]);
  });
  it("persists only the best completed result for a puzzle", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const finished = moveSession(startSession(readySession(puzzle), 1000), { id: "X", to: 6 }, 2000);
    const first = resultFromSession(puzzle, finished, null);
    expect(saveBest(first, storage)).toEqual(first);
    expect(saveBest({ ...first, moves: 2, completionTimeMs: 500 }, storage)).toEqual(first);
    expect(saveBest({ ...first, completed: false, moves: 0 }, storage)).toEqual(first);
    const better = { ...first, completionTimeMs: 800 };
    expect(saveBest(better, storage)).toEqual(better);
    expect(loadBest(puzzle.id, storage)).toEqual(better);
    saveAttempt({ ...first, completed: false, completionTimeMs: null }, storage);
    expect([...values.values()].some(value => value.includes('"completed":false'))).toBe(true);
  });
});
