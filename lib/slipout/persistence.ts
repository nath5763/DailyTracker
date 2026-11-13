import { compareResults, type SlipOutResult } from "./results";

const key = (puzzleId: string) => `slipout:best:v1:${puzzleId}`;
const attemptsKey = (puzzleId: string) => `slipout:attempts:v1:${puzzleId}`;

export function saveAttempt(result: SlipOutResult, storage: Pick<Storage, "getItem" | "setItem">): void {
  let attempts: SlipOutResult[] = [];
  try {
    const stored = JSON.parse(storage.getItem(attemptsKey(result.puzzleId)) || "[]");
    if (Array.isArray(stored)) attempts = stored;
  } catch { /* Replace damaged local history with this verified local result. */ }
  storage.setItem(attemptsKey(result.puzzleId), JSON.stringify([...attempts.slice(-98), result]));
}

export function loadBest(puzzleId: string, storage: Pick<Storage, "getItem">): SlipOutResult | null {
  try {
    const raw = storage.getItem(key(puzzleId));
    if (!raw) return null;
    const result = JSON.parse(raw) as SlipOutResult;
    return result.puzzleId === puzzleId && result.completed && Number.isInteger(result.moves) &&
      typeof result.completionTimeMs === "number" ? result : null;
  } catch { return null; }
}

export function saveBest(result: SlipOutResult, storage: Pick<Storage, "getItem" | "setItem">): SlipOutResult | null {
  const current = loadBest(result.puzzleId, storage);
  if (!result.completed || current && compareResults(result, current) >= 0) return current;
  storage.setItem(key(result.puzzleId), JSON.stringify(result));
  return result;
}
