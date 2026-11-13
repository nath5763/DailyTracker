import { BOARD_SIZE, TARGET_ID, type Block, type Board, type Move } from "./model";

function occupiedByOther(blocks: Board, block: Block, x: number, y: number): boolean {
  return blocks.some(other => other.id !== block.id &&
    x >= other.x && x < other.x + (other.axis === "H" ? other.length : 1) &&
    y >= other.y && y < other.y + (other.axis === "V" ? other.length : 1));
}

export function reachableRange(blocks: Board, id: string): [number, number] {
  const block = blocks.find(item => item.id === id);
  if (!block) throw new Error(`Unknown block ${id}`);
  const horizontal = block.axis === "H";
  const origin = horizontal ? block.x : block.y;
  let minimum = origin;
  let maximum = origin;
  while (minimum > 0 && !occupiedByOther(blocks, block,
    horizontal ? minimum - 1 : block.x, horizontal ? block.y : minimum - 1)) minimum--;
  while (maximum + block.length < BOARD_SIZE && !occupiedByOther(blocks, block,
    horizontal ? maximum + block.length : block.x, horizontal ? block.y : maximum + block.length)) maximum++;
  if (id === TARGET_ID && maximum + block.length === BOARD_SIZE) maximum = BOARD_SIZE;
  return [minimum, maximum];
}

export function applyMove(blocks: Board, move: Move): { blocks: Board; exited: boolean; moved: boolean } {
  const block = blocks.find(item => item.id === move.id);
  if (!block || !Number.isInteger(move.to)) throw new Error("Invalid move");
  const origin = block.axis === "H" ? block.x : block.y;
  if (move.to === origin) return { blocks, exited: false, moved: false };
  const [minimum, maximum] = reachableRange(blocks, move.id);
  if (move.to < minimum || move.to > maximum ||
      move.to > BOARD_SIZE - block.length && !(move.id === TARGET_ID && move.to === BOARD_SIZE))
    throw new Error("Blocked move");
  const next = blocks.map(item => item.id === move.id
    ? { ...item, [item.axis === "H" ? "x" : "y"]: move.to } : item);
  return { blocks: next, exited: move.id === TARGET_ID && move.to === BOARD_SIZE, moved: true };
}

export function legalMoves(blocks: Board): Move[] {
  return blocks.flatMap(block => {
    const origin = block.axis === "H" ? block.x : block.y;
    const [min, max] = reachableRange(blocks, block.id);
    const moves: Move[] = [];
    for (let to = min; to <= max; to++)
      if (to !== origin && (to <= BOARD_SIZE - block.length || block.id === TARGET_ID && to === BOARD_SIZE))
        moves.push({ id: block.id, to });
    return moves;
  });
}
