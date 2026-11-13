import type { Session } from "./session";
import type { Puzzle } from "./puzzles";

export type SlipOutResult = {
  puzzleId: string; puzzleDate: string; playerId: string | null; completed: boolean; moves: number;
  completedAt: string;
};

export function resultFromSession(puzzle: Puzzle, session: Session, playerId: string | null): SlipOutResult {
  if (session.status !== "COMPLETED" && session.status !== "RESTARTED" || session.startedAt === null || session.endedAt === null)
    throw new Error("Attempt is not finished");
  return { puzzleId: puzzle.id, puzzleDate: puzzle.date, playerId, completed: session.status === "COMPLETED",
    moves: session.history.length, completedAt: new Date(session.endedAt).toISOString() };
}

export function compareResults(a: SlipOutResult, b: SlipOutResult): number {
  if (a.completed !== b.completed) return a.completed ? -1 : 1;
  if (!a.completed) return 0;
  return a.moves - b.moves;
}

export function shareText(puzzle: Puzzle, result: SlipOutResult, url: string) {
  return `SlipOut #${puzzle.number}\n${result.completed ? `Solved in ${result.moves} ${result.moves === 1 ? "move" : "moves"}` : `Restarted after ${result.moves} moves`}\nOptimal: ${puzzle.optimalMoves} moves\n\nCan you slip out in fewer moves?\n${url}`;
}
