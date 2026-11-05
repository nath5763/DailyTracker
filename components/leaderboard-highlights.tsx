"use client";

import { AppLink } from "@/components/app-link";
import { formatRankingScore } from "@/lib/format";
import type { Leaderboard } from "@/lib/types";

const labels: Record<string, string> = { today: "Today", "7d": "Last 7 days", "30d": "Last 30 days", all: "All time" };

export function LeaderboardPosition({ board, userId }: { board: Leaderboard; userId: string }) {
  const mine = board.rankings.find(row => row.userId === userId);
  return <div className="my-position" aria-live="polite"><div><p className="section-number">YOUR POSITION · {(labels[board.range] ?? board.range).toUpperCase()}</p><strong>{mine ? `#${mine.rank} of ${board.rankings.length}` : "Not ranked yet"}</strong><p>{mine ? `${formatRankingScore(mine, board.game)} · ${mine.gamesPlayed} score${mine.gamesPlayed === 1 ? "" : "s"}${mine.manualResults ? ` · ${mine.manualResults} manual · unverified` : ""}` : "You have no score in this range."}</p></div>{!mine ? <AppLink className="button button-small" href="/submit">Add score</AppLink> : null}</div>;
}

export function LeaderboardPodium({ board }: { board: Leaderboard }) {
  if (!board.rankings.length) return null;
  return <section className="podium" aria-label={`Top players for ${labels[board.range] ?? board.range}`}><h3>Top players</h3><div className="podium-places">{board.rankings.slice(0, 3).map(row => <AppLink className={`podium-place podium-place-${row.rank}`} href={`/profile/${row.shareId}`} key={row.userId}><span className="podium-medal">#{row.rank}</span><strong>{row.displayName}</strong><small>{formatRankingScore(row, board.game)}{row.manualResults ? " · Manual · unverified" : ""}</small></AppLink>)}</div></section>;
}
