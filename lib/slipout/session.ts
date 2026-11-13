import { applyMove } from "./movement";
import { PUZZLE_SECONDS, type Puzzle } from "./puzzles";
import type { Board, Move } from "./model";

export type GameStatus = "READY" | "PLAYING" | "COMPLETED" | "TIME_EXPIRED";
export type Session = { status: GameStatus; blocks: Board; history: Move[]; startedAt: number | null; endedAt: number | null };
export const LIMIT_MS = PUZZLE_SECONDS * 1000;

export function readySession(puzzle: Puzzle): Session {
  return { status: "READY", blocks: puzzle.blocks, history: [], startedAt: null, endedAt: null };
}

export function startSession(session: Session, now: number): Session {
  return session.status === "READY" ? { ...session, status: "PLAYING", startedAt: now } : session;
}

export function remainingMs(session: Session, now: number): number {
  return session.startedAt === null ? LIMIT_MS : Math.max(0, LIMIT_MS - ((session.endedAt ?? now) - session.startedAt));
}

export function expireSession(session: Session, now: number): Session {
  if (session.status !== "PLAYING" || session.startedAt === null || now < session.startedAt + LIMIT_MS) return session;
  return { ...session, status: "TIME_EXPIRED", endedAt: session.startedAt + LIMIT_MS };
}

export function moveSession(session: Session, move: Move, now: number): Session {
  const current = expireSession(session, now);
  if (current.status !== "PLAYING") return current;
  const applied = applyMove(current.blocks, move);
  if (!applied.moved) return current;
  return { ...current, blocks: applied.blocks, history: [...current.history, move],
    status: applied.exited ? "COMPLETED" : "PLAYING", endedAt: applied.exited ? now : null };
}
