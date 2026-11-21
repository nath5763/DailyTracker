"use client";

import { AppLink } from "@/components/app-link";
import { LeaderboardMemberScoresPanel, memberScoresPanelId, type ExpandedPlayer } from "@/components/leaderboard-member-scores";
import { formatRankingScore } from "@/lib/format";
import { aggregateMetrics } from "@/lib/leaderboard-metrics";
import type { Leaderboard } from "@/lib/types";

const labels: Record<string, string> = { today: "Today", "7d": "Last 7 days", "30d": "Last 30 days", all: "All time" };

export function LeaderboardPosition({ board, userId }: { board: Leaderboard; userId: string }) {
  const mine = board.rankings.find(row => row.userId === userId);
  const metrics = mine ? aggregateMetrics(mine) : null;
  return <div className="my-position" aria-live="polite"><div><p className="section-number">YOUR POSITION · {(labels[board.range] ?? board.range).toUpperCase()}</p><strong>{mine ? `#${mine.rank} of ${board.rankings.length}` : "Not ranked yet"}</strong>{mine ? board.range === "today" ? <p>{formatRankingScore(mine, board.game)} · {mine.gamesPlayed} score{mine.gamesPlayed === 1 ? "" : "s"}{mine.manualResults ? ` · ${mine.manualResults} manual · unverified` : ""}</p> : <div className="personal-aggregate-metrics"><span><strong>{metrics?.averagePlacement}</strong><small>Avg. placement</small></span><span><strong>{metrics?.averageScore}</strong><small>Avg. score</small></span><span><strong>{metrics?.resultsPlayed}</strong><small>Results played</small></span></div> : <p>You have no score in this range.</p>}</div>{!mine ? <AppLink className="button button-small" href="/submit">Add score</AppLink> : null}</div>;
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
    const metrics = aggregateMetrics(row);
    return <button className={`podium-place podium-place-${row.rank}`} type="button" aria-expanded={expanded?.userId === row.userId && expanded.location === "podium"} aria-controls={panelId} onClick={() => onToggle(row.userId, "podium")} key={row.userId}><span className="podium-medal">#{row.rank}</span><strong>{row.displayName}</strong>{board.range === "today" ? <small>{formatRankingScore(row, board.game)}{row.manualResults ? " · Manual · unverified" : ""}</small> : <span className="podium-aggregate-metrics"><strong>{metrics.averagePlacement}</strong><small>{metrics.averageScore} avg. score</small>{row.manualResults ? <small>Manual · unverified</small> : null}</span>}</button>;
  })}</div>{open ? <LeaderboardMemberScoresPanel boardId={board.id} userId={open.userId} shareId={open.shareId} game={board.game} range={board.range} panelId={memberScoresPanelId(open.userId, "podium")} /> : null}</section>;
}
