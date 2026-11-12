import { formatRankingScore } from "@/lib/format";
import type { Leaderboard } from "@/lib/types";

const rangeLabels: Record<string, string> = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  all: "All time",
};

export function whatsappUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function leaderboardUrl(board: Leaderboard, origin: string): string {
  const url = new URL(`/leaderboards/${encodeURIComponent(board.id)}`, origin);
  url.searchParams.set("game", board.game.slug);
  url.searchParams.set("range", board.range);
  return url.toString();
}

export function leaderboardResultsMessage(board: Leaderboard, leaderboardUrl: string): string {
  const lines = [
    `${board.name} — ${board.game.name} leaderboard (${rangeLabels[board.range] ?? board.range})`,
    ...(!board.rankings.length
      ? ["No scores have been posted yet."]
      : board.rankings.slice(0, 3).map(row => `#${row.rank} ${row.displayName}: ${formatRankingScore(row, board.game)}`)),
    leaderboardUrl,
  ];
  return lines.join("\n");
}

export function leaderboardInviteMessage(url: string): string {
  return `Join my Daily Tracker leaderboard!\n${url}`;
}
