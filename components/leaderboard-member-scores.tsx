"use client";

import { AppLink } from "@/components/app-link";
import { leaderboardMemberScoresCachePath, useCachedApi } from "@/lib/client-cache";
import { formatRankingScore, formatResultScore } from "@/lib/format";
import { aggregateMetrics } from "@/lib/leaderboard-metrics";
import type { Game, LeaderboardMemberScores } from "@/lib/types";

export type ExpandedPlayer = { userId: string; location: "ranking" | "podium" | "combined" } | null;

export function nextExpandedPlayer(current: ExpandedPlayer, userId: string,
                                   location: NonNullable<ExpandedPlayer>["location"]): ExpandedPlayer {
  return current?.userId === userId ? null : { userId, location };
}

export function memberScoresPanelId(userId: string, location: NonNullable<ExpandedPlayer>["location"]) {
  return `player-scores-${location}-${userId}`;
}

export function LeaderboardMemberScoresPanel({ boardId, userId, shareId, game, range, panelId }: {
  boardId: string;
  userId: string;
  shareId: string;
  game: Game;
  range: string;
  panelId: string;
}) {
  const path = leaderboardMemberScoresCachePath(boardId, userId, game.slug, range);
  const result = useCachedApi<LeaderboardMemberScores>(path, { storage: "memory" });
  async function retry() {
    try { await result.refresh(); } catch { /* The hook exposes the retry error inline. */ }
  }
  return <div className="member-scores-panel" id={panelId} role="region" aria-label={`${result.data?.member.displayName ?? "Player"} scores`}>
    {result.loading ? <p className="member-scores-status" aria-live="polite">Loading player scores…</p> : null}
    {!result.loading && result.error ? <div className="member-scores-status" role="alert"><p>{result.error}</p><button className="button button-small button-ghost" type="button" onClick={() => void retry()}>Retry</button></div> : null}
    {result.data ? <MemberScoresContent details={result.data} shareId={shareId} /> : null}
  </div>;
}

function MemberScoresContent({ details, shareId }: { details: LeaderboardMemberScores; shareId: string }) {
  const ranking = details.ranking;
  const metrics = ranking ? aggregateMetrics(ranking) : null;
  const aggregate = details.period !== "today";
  return <>
    <div className="member-scores-heading"><div><p className="section-number">{details.game.name.toUpperCase()} RESULTS</p><h3>{details.member.displayName}</h3></div><AppLink className="secondary-link" href={`/profile/${shareId}`}>View full profile</AppLink></div>
    <div className="member-score-summary">
      <Summary label="Rank" value={ranking ? `#${ranking.rank} of ${details.rankedPlayerCount}` : "Not ranked"} />
      {aggregate ? <><Summary label="Avg. placement" value={metrics?.averagePlacement ?? "—"} /><Summary label="Avg. score" value={metrics?.averageScore ?? "—"} /></> : <Summary label="Result" value={ranking ? formatRankingScore(ranking, details.game) : "—"} />}
      <Summary label={aggregate ? "Results played" : "Scores"} value={String(details.scores.length)} />
      <Summary label="Manual" value={String(ranking?.manualResults ?? 0)} />
      <Summary label="Assisted" value={String(ranking?.assistedResults ?? 0)} />
      <Summary label="Unknown assistance" value={String(ranking?.unknownAssistanceResults ?? 0)} />
    </div>
    {ranking && ((ranking.hints ?? 0) || (ranking.mistakes ?? 0) || (ranking.beginnerAssists ?? 0)) ? <p className="member-assistance-detail">{ranking.hints ?? 0} hints · {ranking.mistakes ?? 0} mistakes · {ranking.beginnerAssists ?? 0} beginner assists</p> : null}
    {!details.scores.length ? <div className="empty compact-empty">No {details.game.name} scores for this period.</div> : <div className="member-score-results" aria-label="Individual results">
      {details.scores.map((score) => <div className="member-score-result" key={score.id}><span><strong>{score.puzzleKey}</strong><small>{formatDate(score.playedOn)}</small></span><strong>{formatResultScore(score)}</strong></div>)}
    </div>}
  </>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day)));
}
