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
