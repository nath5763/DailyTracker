import { applyMove } from "./movement";
import type { Puzzle } from "./puzzles";
import type { Board, Move } from "./model";

export type GameStatus = "READY" | "PLAYING" | "COMPLETED" | "RESTARTED";
export type Session = { status: GameStatus; blocks: Board; history: Move[]; startedAt: number | null; endedAt: number | null };

export function readySession(puzzle: Puzzle): Session {
  return { status: "READY", blocks: puzzle.blocks, history: [], startedAt: null, endedAt: null };
}

export function startSession(session: Session, now: number): Session {
  return session.status === "READY" ? { ...session, status: "PLAYING", startedAt: now } : session;
}

export function moveSession(session: Session, move: Move, now: number): Session {
  if (session.status !== "PLAYING") return session;
  const applied = applyMove(session.blocks, move);
  if (!applied.moved) return session;
  return { ...session, blocks: applied.blocks, history: [...session.history, move],
    status: applied.exited ? "COMPLETED" : "PLAYING", endedAt: applied.exited ? now : null };
}

export function undoSession(session: Session, puzzle: Puzzle): Session {
  if (session.status !== "PLAYING" || session.history.length === 0) return session;
  const history = session.history.slice(0, -1);
  const blocks = history.reduce((current, move) => applyMove(current, move).blocks, puzzle.blocks);
  return { ...session, status: "PLAYING", blocks, history, endedAt: null };
}
