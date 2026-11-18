type TileWithId = { id: number };

export function reconcileTileDisplayOrder(
  displayOrder: readonly number[],
  tiles: readonly TileWithId[],
): number[] {
  const availableIds = new Set(tiles.map(tile => tile.id));
  const includedIds = new Set<number>();
  const nextOrder: number[] = [];

  for (const id of displayOrder) {
    if (availableIds.has(id) && !includedIds.has(id)) {
      nextOrder.push(id);
      includedIds.add(id);
    }
  }

  for (const tile of tiles) {
    if (!includedIds.has(tile.id)) {
      nextOrder.push(tile.id);
      includedIds.add(tile.id);
    }
  }

  return nextOrder;
}

export function shuffleTileDisplayOrder(
  tileIds: readonly number[],
  random: () => number = Math.random,
): number[] {
  const shuffled = [...tileIds];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  if (shuffled.length > 1 && shuffled.every((id, index) => id === tileIds[index])) {
    shuffled.push(shuffled.shift()!);
  }

  return shuffled;
}

export function tilesInDisplayOrder<Tile extends TileWithId>(
  tiles: readonly Tile[],
  displayOrder: readonly number[],
): Tile[] {
  const tilesById = new Map(tiles.map(tile => [tile.id, tile]));
  return reconcileTileDisplayOrder(displayOrder, tiles).map(id => tilesById.get(id)!);
}
