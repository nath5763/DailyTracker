import { forwardRef } from "react";
import { formatResultScore, formatScore } from "@/lib/format";
import type { Leaderboard, LeaderboardMemberScores, Score } from "@/lib/types";

const periods: Record<string, string> = {
  today: "Today", "7d": "Last 7 days", "30d": "Last 30 days", all: "All time",
};

export function gameResultStats(scores: Score[], game: Leaderboard["game"]) {
  if (!scores.length) return null;
  const values = scores.map((score) => score.primaryScore);
  const best = values.reduce((current, value) => game.rankingDirection === "lower"
    ? Math.min(current, value) : Math.max(current, value));
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return { count: values.length, best: formatScore(best, game.scoreFormat), average: formatScore(average, game.scoreFormat) };
}

export const ShareableLeaderboardCard = forwardRef<HTMLDivElement, {
  board: Leaderboard; currentUserId: string; resultsByPlayer?: Record<string, LeaderboardMemberScores>;
}>(function ShareableLeaderboardCard({ board, currentUserId, resultsByPlayer = {} }, ref) {
  const topPlayers = board.rankings.slice(0, 3);
  const ownRanking = board.rankings.find((player) => player.userId === currentUserId);
  const ownMember = board.members.find((member) => member.userId === currentUserId);
  const players = [...topPlayers];
  if (!topPlayers.some((player) => player.userId === currentUserId)) {
    if (ownRanking) players.push(ownRanking);
    else if (ownMember) players.push({ rank: 0, userId: ownMember.userId, shareId: ownMember.shareId,
      displayName: ownMember.displayName, average: 0, gamesPlayed: 0 });
  }
  return <div className="share-card" ref={ref} aria-label={`${board.name} results card`}>
    <div className="share-card-header">
      <div className="share-card-kicker">DAILY TRACKER <span>·</span> LEADERBOARD RESULTS</div>
      <div className="share-card-period">{periods[board.range] ?? board.range}</div>
    </div>
    <div className="share-card-title">
      <h2 title={board.name}>{board.name}</h2>
      <p>{board.game.name}</p>
    </div>
    <div className="share-card-players">
      {!topPlayers.length ? <div className="share-card-empty">No scores in this period yet.</div> : null}
      {players.map((player) => {
        const results = resultsByPlayer[player.userId];
        const latest = results?.scores[0];
        const stats = results ? gameResultStats(results.scores, board.game) : null;
        const isOwn = player.userId === currentUserId;
        return <div className={`share-card-player${player.rank === 1 ? " share-card-first" : ""}${isOwn ? " share-card-own" : ""}`} key={player.userId}>
          <span className="share-card-rank">{player.rank ? `#${player.rank}` : "—"}</span>
          <span className="share-card-name" title={player.displayName}>{player.displayName}{isOwn ? <small>YOU</small> : null}</span>
          {player.rank ? board.range === "today" ? <div className="share-card-result">
            <span className="share-card-result-label">Today’s {board.game.submission.scoreLabel || "score"}</span>
            <strong className="share-card-score">{latest ? formatResultScore(latest) : "—"}</strong>
          </div> : <div className="share-card-stats">
            <span><small>RESULTS</small><strong>{stats?.count ?? "—"}</strong></span>
            <span><small>BEST</small><strong>{stats?.best ?? "—"}</strong></span>
            <span><small>AVERAGE</small><strong>{stats?.average ?? "—"}</strong></span>
          </div> : <span className="share-card-unranked">Unranked this period</span>}
        </div>;
      })}
    </div>
    <div className="share-card-footer">
      <div className="share-card-brand"><span className="share-card-mark">D</span><span>Daily Tracker<small>dailytracker.cc</small></span></div>
      <div className="share-card-join"><span>MAKE YOUR OWN DAILY GAMES CLUB</span><span>Join Daily Tracker at dailytracker.cc</span></div>
    </div>
  </div>;
});
