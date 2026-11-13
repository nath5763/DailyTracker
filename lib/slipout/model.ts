export type Axis = "H" | "V";
export type Block = { id: string; x: number; y: number; length: 2 | 3; axis: Axis };
export type Move = { id: string; to: number };
export type Board = Block[];

export const BOARD_SIZE = 6;
export const TARGET_ID = "X";

export function validBoard(blocks: Board): boolean {
  if (!blocks.length || blocks[0].id !== TARGET_ID || blocks[0].axis !== "H" || blocks[0].y !== 2) return false;
  const ids = new Set<string>();
  const cells = new Set<string>();
  for (const block of blocks) {
    if (ids.has(block.id) || ![2, 3].includes(block.length) || !Number.isInteger(block.x) || !Number.isInteger(block.y) ||
      block.x < 0 || block.y < 0 || block.x + (block.axis === "H" ? block.length : 1) > BOARD_SIZE ||
      block.y + (block.axis === "V" ? block.length : 1) > BOARD_SIZE) return false;
    ids.add(block.id);
    for (let i = 0; i < block.length; i++) {
      const cell = `${block.x + (block.axis === "H" ? i : 0)},${block.y + (block.axis === "V" ? i : 0)}`;
      if (cells.has(cell)) return false;
      cells.add(cell);
    }
  }
  return true;
}
