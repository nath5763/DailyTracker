import type { Session } from "./session";
import type { Puzzle } from "./puzzles";

export type SlipOutResult = {
  puzzleId: string; puzzleDate: string; playerId: string | null; completed: boolean; moves: number;
  completionTimeMs: number | null; remainingTimeMs: number; completedAt: string;
};

export function resultFromSession(puzzle: Puzzle, session: Session, playerId: string | null): SlipOutResult {
  if (session.status !== "COMPLETED" && session.status !== "TIME_EXPIRED" || session.startedAt === null || session.endedAt === null)
    throw new Error("Attempt is not finished");
  const elapsed = Math.max(0, session.endedAt - session.startedAt);
  return { puzzleId: puzzle.id, puzzleDate: puzzle.date, playerId, completed: session.status === "COMPLETED",
    moves: session.history.length, completionTimeMs: session.status === "COMPLETED" ? elapsed : null,
    remainingTimeMs: Math.max(0, 90_000 - elapsed), completedAt: new Date(session.endedAt).toISOString() };
}

export function compareResults(a: SlipOutResult, b: SlipOutResult): number {
  if (a.completed !== b.completed) return a.completed ? -1 : 1;
  if (!a.completed) return 0;
  return a.moves - b.moves || (a.completionTimeMs ?? Infinity) - (b.completionTimeMs ?? Infinity);
}

export function formatTime(ms: number, digits: 1 | 2 = 1): string {
  const factor = digits === 1 ? 100 : 10;
  const rounded = Math.floor(Math.max(0, ms) / factor);
  const seconds = Math.floor(rounded / (digits === 1 ? 10 : 100));
  const fraction = String(rounded % (digits === 1 ? 10 : 100)).padStart(digits, "0");
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}.${fraction}`;
}

export function formatCountdown(ms: number): string {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function shareText(puzzle: Puzzle, result: SlipOutResult, url: string) {
  return `SlipOut #${puzzle.number}\n${result.completed ? `Solved in ${result.moves} moves\nTime: ${formatTime(result.completionTimeMs ?? 0)}` : `Time's up after ${result.moves} moves`}\nOptimal: ${puzzle.optimalMoves} moves\n\nCan you slip out faster?\n${url}`;
}
