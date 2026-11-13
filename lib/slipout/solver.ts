import { applyMove, legalMoves } from "./movement";
import { validBoard, type Board, type Move } from "./model";

function key(blocks: Board) { return blocks.map(block => block.axis === "H" ? block.x : block.y).join(""); }

export function solve(blocks: Board, stateLimit = 100_000): { moves: Move[]; explored: number } | null {
  if (!validBoard(blocks)) return null;
  const queue: { board: Board; path: Move[] }[] = [{ board: blocks, path: [] }];
  const seen = new Set([key(blocks)]);
  for (let head = 0; head < queue.length; head++) {
    const { board, path } = queue[head];
    for (const move of legalMoves(board)) {
      const next = applyMove(board, move);
      const moves = [...path, move];
      if (next.exited) return { moves, explored: seen.size };
      const signature = key(next.blocks);
      if (seen.has(signature)) continue;
      seen.add(signature);
      if (seen.size > stateLimit) return null;
      queue.push({ board: next.blocks, path: moves });
    }
  }
  return null;
}
