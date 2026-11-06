"use client";

import { AppLink } from "@/components/app-link";
import { LeaderboardMemberScoresPanel, memberScoresPanelId, type ExpandedPlayer } from "@/components/leaderboard-member-scores";
import { formatRankingScore } from "@/lib/format";
import type { Leaderboard } from "@/lib/types";

const labels: Record<string, string> = { today: "Today", "7d": "Last 7 days", "30d": "Last 30 days", all: "All time" };

export function LeaderboardPosition({ board, userId }: { board: Leaderboard; userId: string }) {
  const mine = board.rankings.find(row => row.userId === userId);
  return <div className="my-position" aria-live="polite"><div><p className="section-number">YOUR POSITION · {(labels[board.range] ?? board.range).toUpperCase()}</p><strong>{mine ? `#${mine.rank} of ${board.rankings.length}` : "Not ranked yet"}</strong><p>{mine ? `${formatRankingScore(mine, board.game)} · ${mine.gamesPlayed} score${mine.gamesPlayed === 1 ? "" : "s"}${mine.manualResults ? ` · ${mine.manualResults} manual · unverified` : ""}` : "You have no score in this range."}</p></div>{!mine ? <AppLink className="button button-small" href="/submit">Add score</AppLink> : null}</div>;
}

export function LeaderboardPodium({ board, expanded, onToggle }: {
  board: Leaderboard;
  expanded: ExpandedPlayer;
  onToggle: (userId: string, location: NonNullable<ExpandedPlayer>["location"]) => void;
}) {
  if (!board.rankings.length) return null;
  const podium = board.rankings.slice(0, 3);
  const open = expanded?.location === "podium" ? podium.find(row => row.userId === expanded.userId) : undefined;
  return <section className="podium" aria-label={`Top players for ${labels[board.range] ?? board.range}`}><h3>Top players</h3><div className="podium-places">{podium.map(row => {
    const panelId = memberScoresPanelId(row.userId, "podium");
    return <button className={`podium-place podium-place-${row.rank}`} type="button" aria-expanded={expanded?.userId === row.userId && expanded.location === "podium"} aria-controls={panelId} onClick={() => onToggle(row.userId, "podium")} key={row.userId}><span className="podium-medal">#{row.rank}</span><strong>{row.displayName}</strong><small>{formatRankingScore(row, board.game)}{row.manualResults ? " · Manual · unverified" : ""}</small></button>;
  })}</div>{open ? <LeaderboardMemberScoresPanel boardId={board.id} userId={open.userId} shareId={open.shareId} game={board.game} range={board.range} panelId={memberScoresPanelId(open.userId, "podium")} /> : null}</section>;
}
