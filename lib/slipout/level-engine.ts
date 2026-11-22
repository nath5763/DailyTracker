export type Axis = "H" | "V";
export type Side = "left" | "right" | "top" | "bottom";
export type LevelBlock = { id: string; x: number; y: number; width: number; height: number; axis: Axis | "B" };
export type LevelMove = { id: string; axis: Axis; to: number };
export type Level = { id: string; number: number; difficulty: "tutorial" | "easy" | "medium" | "hard"; optimalMoves: number;
  startAxis: Axis; exit: { side: Side; cell: number }; switches: { x: number; y: number }[]; blocks: LevelBlock[] };
export type LevelState = { blocks: LevelBlock[]; activeAxis: Axis };
export const LEVEL_BOARD_SIZE = 6;

export function initialLevelState(level: Level): LevelState {
  return { blocks: level.blocks, activeAxis: level.startAxis };
}

export function validLevel(level: Level): boolean {
  if (level.blocks[0]?.id !== "X" || level.blocks[0].axis !== "B" || !["H", "V"].includes(level.startAxis) ||
      !["left", "right", "top", "bottom"].includes(level.exit?.side) ||
      !Number.isInteger(level.exit.cell) || level.exit.cell < 0 || level.exit.cell >= 6 ||
      !Array.isArray(level.switches) || level.switches.length === 0) return false;
  const target = level.blocks[0];
  if (![[1, 1], [2, 1], [1, 2]].some(([w, h]) => w === target.width && h === target.height) ||
      target.width === 2 && level.startAxis !== "H" || target.height === 2 && level.startAxis !== "V") return false;
  const switchCells = new Set<string>();
  for (const cell of level.switches) {
    if (!Number.isInteger(cell.x) || !Number.isInteger(cell.y) || cell.x < 0 || cell.x >= 6 || cell.y < 0 || cell.y >= 6 ||
        switchCells.has(`${cell.x},${cell.y}`)) return false;
    switchCells.add(`${cell.x},${cell.y}`);
  }
  const ids = new Set<string>(), cells = new Set<string>();
  for (const block of level.blocks) {
    if (ids.has(block.id) || !Number.isInteger(block.x) || !Number.isInteger(block.y) ||
        block.width < 1 || block.height < 1 || block.x < 0 || block.y < 0 ||
        block.x + block.width > 6 || block.y + block.height > 6 ||
        (block.id !== "X" && !(block.axis === "H" ? block.height === 1 && [2, 3].includes(block.width) :
          block.axis === "V" && block.width === 1 && [2, 3].includes(block.height)))) return false;
    ids.add(block.id);
    for (let x = block.x; x < block.x + block.width; x++) for (let y = block.y; y < block.y + block.height; y++) {
      const key = `${x},${y}`;
      if (cells.has(key)) return false;
      cells.add(key);
    }
  }
  return true;
}

function overlaps(a: LevelBlock, b: LevelBlock): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
function covers(block: LevelBlock, x: number, y: number): boolean {
  return x >= block.x && x < block.x + block.width && y >= block.y && y < block.y + block.height;
}
function shifted(block: LevelBlock, axis: Axis, to: number): LevelBlock {
  return axis === "H" ? { ...block, x: to } : { ...block, y: to };
}
function canExit(level: Level, block: LevelBlock, axis: Axis, side: Side): boolean {
  if (block.id !== "X" || level.exit.side !== side || axis !== (side === "left" || side === "right" ? "H" : "V")) return false;
  return side === "left" || side === "right" ? block.height === 1 && block.y === level.exit.cell :
    block.width === 1 && block.x === level.exit.cell;
}

export function levelRange(level: Level, state: LevelState, id: string, axis: Axis): [number, number] {
  const block = state.blocks.find(value => value.id === id);
  if (!block || (block.id === "X" ? axis !== state.activeAxis : block.axis !== axis)) throw new Error("Invalid axis");
  const origin = axis === "H" ? block.x : block.y;
  let min = origin, max = origin;
  const free = (to: number) => !state.blocks.some(other => other.id !== id && overlaps(shifted(block, axis, to), other));
  while (min > 0 && free(min - 1)) min--;
  while (max + (axis === "H" ? block.width : block.height) < 6 && free(max + 1)) max++;
  if (axis === "H") {
    if (min === 0 && canExit(level, block, axis, "left")) min = -1;
    if (max + block.width === 6 && canExit(level, block, axis, "right")) max = 6;
  } else {
    if (min === 0 && canExit(level, block, axis, "top")) min = -1;
    if (max + block.height === 6 && canExit(level, block, axis, "bottom")) max = 6;
  }
  return [min, max];
}

export function applyLevelMove(level: Level, state: LevelState, move: LevelMove): { state: LevelState; exited: boolean; moved: boolean } {
  const block = state.blocks.find(value => value.id === move.id);
  if (!block || !["H", "V"].includes(move.axis) || !Number.isInteger(move.to)) throw new Error("Invalid move");
  const [min, max] = levelRange(level, state, move.id, move.axis);
  const origin = move.axis === "H" ? block.x : block.y;
  if (move.to === origin) return { state, exited: false, moved: false };
  if (move.to < min || move.to > max) throw new Error("Blocked move");
  const side = level.exit.side;
  const exiting = block.id === "X" && (move.to === -1 && (side === "left" || side === "top") ||
    move.to === 6 && (side === "right" || side === "bottom"));
  const end = exiting ? move.to === -1 ? 0 : 6 - (move.axis === "H" ? block.width : block.height) : move.to;
  if (!exiting && (end < 0 || end + (move.axis === "H" ? block.width : block.height) > 6)) throw new Error("Blocked move");
  const nextBlock = shifted(block, move.axis, move.to);
  const toggled = block.id === "X" && !exiting && level.switches.some(cell =>
    covers(nextBlock, cell.x, cell.y) && !covers(block, cell.x, cell.y));
  return { state: { blocks: state.blocks.map(value => value.id === block.id ? nextBlock : value),
    activeAxis: toggled ? state.activeAxis === "H" ? "V" : "H" : state.activeAxis }, exited: exiting, moved: true };
}

export function replayLevelMoves(level: Level, moves: readonly LevelMove[]): LevelState {
  return moves.reduce((state, move) => applyLevelMove(level, state, move).state, initialLevelState(level));
}

export function solveLevelPath(level: Level, limit = 500_000): LevelMove[] | null {
  if (!validLevel(level)) return null;
  const key = (state: LevelState) => `${state.activeAxis}:${state.blocks.map(block => `${block.x},${block.y}`).join(";")}`;
  const start = initialLevelState(level);
  const queue: { state: LevelState; parent: number; move: LevelMove | null }[] = [{ state: start, parent: -1, move: null }];
  const seen = new Set([key(start)]);
  for (let head = 0; head < queue.length; head++) {
    const { state } = queue[head];
    for (const block of state.blocks) {
      const axis = block.id === "X" ? state.activeAxis : block.axis as Axis;
      const [min, max] = levelRange(level, state, block.id, axis);
      const origin = axis === "H" ? block.x : block.y;
      for (let to = min; to <= max; to++) {
        if (to === origin || to < 0 && to !== -1 || to > 6 - (axis === "H" ? block.width : block.height) && to !== 6) continue;
        const move = { id: block.id, axis, to };
        const next = applyLevelMove(level, state, move);
        if (next.exited) {
          const path = [move];
          for (let index = head; index > 0; index = queue[index].parent) path.unshift(queue[index].move!);
          return path;
        }
        const signature = key(next.state);
        if (seen.has(signature)) continue;
        seen.add(signature);
        if (seen.size > limit) return null;
        queue.push({ state: next.state, parent: head, move });
      }
    }
  }
  return null;
}

export function solveLevel(level: Level, limit?: number): number | null {
  return solveLevelPath(level, limit)?.length ?? null;
}
