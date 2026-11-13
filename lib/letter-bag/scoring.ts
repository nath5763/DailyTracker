const BONUSES: Record<string, number> = { Q: 2, Z: 2, J: 1, X: 1, K: 1, V: 1 };

export function letterBonus(letter: string): number {
  return BONUSES[letter.toUpperCase()] ?? 0;
}

export function baseWordPoints(length: number): number {
  return length > 0 ? 1 + length * (length + 1) / 2 : 0;
}

export function wordScore(word: string) {
  const letters = [...word.toUpperCase()];
  const base = baseWordPoints(letters.length);
  const bonus = letters.reduce((sum, letter) => sum + letterBonus(letter), 0);
  return { base, bonus, total: base + bonus };
}
