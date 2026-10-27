export type ScoreRow = { userId: string; displayName: string; scores: number[] };

export function rankScores(rows: ScoreRow[]) {
  return rows
    .filter((row) => row.scores.length > 0)
    .map((row) => ({
      ...row,
      average: row.scores.reduce((sum, score) => sum + score, 0) / row.scores.length,
      gamesPlayed: row.scores.length,
    }))
    .sort(
      (a, b) =>
        a.average - b.average || b.gamesPlayed - a.gamesPlayed || a.displayName.localeCompare(b.displayName),
    )
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function currentStreak(dates: string[], today: string): number {
  const unique = new Set(dates);
  const candidates = [today, shift(today, -1)];
  const start = candidates.find((date) => unique.has(date));
  if (!start) return 0;
  let streak = 0;
  let cursor = start;
  while (unique.has(cursor)) {
    streak += 1;
    cursor = shift(cursor, -1);
  }
  return streak;
}

function shift(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
