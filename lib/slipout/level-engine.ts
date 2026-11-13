export type LevelAxis = "H" | "V" | "B";
export type LevelBlock = { id: string; x: number; y: number; width: number; height: number; axis: LevelAxis };
export type LevelMove = { id: string; axis: "H" | "V"; to: number };
export type Level = { id: string; number: number; difficulty: "easy" | "medium" | "hard"; optimalMoves: number; blocks: LevelBlock[] };
export const LEVEL_BOARD_SIZE = 6;

export function validLevel(level: Level): boolean {
  if (level.blocks[0]?.id !== "X" || level.blocks[0].axis !== "B") return false;
  const ids = new Set<string>();
  const cells = new Set<string>();
  for (const block of level.blocks) {
    if (ids.has(block.id) || !Number.isInteger(block.x) || !Number.isInteger(block.y) ||
        block.width < 1 || block.height < 1 || block.x < 0 || block.y < 0 ||
        block.x + block.width > 6 || block.y + block.height > 6 ||
        (block.id === "X" ? block.width > 2 || block.height > 2 :
          block.axis === "H" ? block.height !== 1 || ![2, 3].includes(block.width) :
          block.axis === "V" ? block.width !== 1 || ![2, 3].includes(block.height) : true)) return false;
    ids.add(block.id);
    for (let x = block.x; x < block.x + block.width; x++) for (let y = block.y; y < block.y + block.height; y++) {
      const key = `${x},${y}`;
      if (cells.has(key)) return false;
      cells.add(key);
    }
  }
  return true;
}

function collides(blocks: LevelBlock[], id: string, x: number, y: number, width: number, height: number): boolean {
  return blocks.some(other => other.id !== id && x < other.x + other.width && x + width > other.x &&
    y < other.y + other.height && y + height > other.y);
}

export function levelRange(blocks: LevelBlock[], id: string, axis: "H" | "V"): [number, number] {
  const block = blocks.find(value => value.id === id);
  if (!block || block.axis !== "B" && block.axis !== axis) throw new Error("Invalid axis");
  const origin = axis === "H" ? block.x : block.y;
  let min = origin, max = origin;
  while (min > 0 && !collides(blocks, id, axis === "H" ? min - 1 : block.x,
    axis === "V" ? min - 1 : block.y, block.width, block.height)) min--;
  while (max + (axis === "H" ? block.width : block.height) < 6 && !collides(blocks, id,
    axis === "H" ? max + 1 : block.x, axis === "V" ? max + 1 : block.y, block.width, block.height)) max++;
  if (id === "X" && axis === "H" && block.y === 2 && max + block.width === 6) max = 6;
  return [min, max];
}

export function applyLevelMove(blocks: LevelBlock[], move: LevelMove): { blocks: LevelBlock[]; exited: boolean; moved: boolean } {
  const block = blocks.find(value => value.id === move.id);
  if (!block || !["H", "V"].includes(move.axis) || !Number.isInteger(move.to)) throw new Error("Invalid move");
  const origin = move.axis === "H" ? block.x : block.y;
  if (move.to === origin) return { blocks, exited: false, moved: false };
  const [min, max] = levelRange(blocks, move.id, move.axis);
  if (move.to < min || move.to > max || move.to > 6 - (move.axis === "H" ? block.width : block.height) &&
      !(move.id === "X" && move.axis === "H" && move.to === 6)) throw new Error("Blocked move");
  return { blocks: blocks.map(value => value.id === move.id ? { ...value, [move.axis === "H" ? "x" : "y"]: move.to } : value),
    exited: move.id === "X" && move.axis === "H" && move.to === 6, moved: true };
}

export function solveLevel(level: Level, limit = 500_000): number | null {
  if (!validLevel(level)) return null;
  const key = (blocks: LevelBlock[]) => blocks.map(block => `${block.x}${block.y}`).join("");
  const queue: { blocks: LevelBlock[]; distance: number }[] = [{ blocks: level.blocks, distance: 0 }];
  const seen = new Set([key(level.blocks)]);
  for (let head = 0; head < queue.length; head++) {
    const { blocks, distance } = queue[head];
    for (const block of blocks) for (const axis of block.axis === "B" ? ["H", "V"] as const : [block.axis]) {
      const [min, max] = levelRange(blocks, block.id, axis);
      const origin = axis === "H" ? block.x : block.y;
      for (let to = min; to <= max; to++) {
        if (to === origin || to > 6 - (axis === "H" ? block.width : block.height) && to !== 6) continue;
        const next = applyLevelMove(blocks, { id: block.id, axis, to });
        if (next.exited) return distance + 1;
        const signature = key(next.blocks);
        if (seen.has(signature)) continue;
        seen.add(signature);
        if (seen.size > limit) return null;
        queue.push({ blocks: next.blocks, distance: distance + 1 });
      }
    }
  }
  return null;
}
