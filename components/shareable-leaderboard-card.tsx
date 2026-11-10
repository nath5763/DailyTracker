import { forwardRef } from "react";
import { formatRankingScore } from "@/lib/format";
import type { Leaderboard } from "@/lib/types";

const periods: Record<string, string> = {
  today: "Today", "7d": "Last 7 days", "30d": "Last 30 days", all: "All time",
};

export const ShareableLeaderboardCard = forwardRef<HTMLDivElement, {
  board: Leaderboard; inviteUrl?: string | null;
}>(function ShareableLeaderboardCard({ board, inviteUrl }, ref) {
  const topPlayers = board.rankings.slice(0, 3);
  return <div className="share-card" ref={ref} aria-label={`${board.name} results card`}>
    <div className="share-card-header">
      <div className="share-card-kicker">DAILYTRACKER <span>·</span> LEADERBOARD RESULTS</div>
      <div className="share-card-period">{periods[board.range] ?? board.range}</div>
    </div>
    <div className="share-card-title">
      <h2 title={board.name}>{board.name}</h2>
      <p>{board.game.name}</p>
    </div>
    <div className="share-card-players">
      {topPlayers.length ? topPlayers.map((player) => <div className={`share-card-player${player.rank === 1 ? " share-card-first" : ""}`} key={player.userId}>
        <span className="share-card-rank">#{player.rank}</span>
        <span className="share-card-name" title={player.displayName}>{player.displayName}</span>
        <strong className="share-card-score">{formatRankingScore(player, board.game)}</strong>
      </div>) : <div className="share-card-empty">No scores in this period yet. Your next game could start the board.</div>}
    </div>
    <div className="share-card-footer">
      <div className="share-card-brand"><span className="share-card-mark">D</span><span>DailyTracker<small>dailytracker.cc</small></span></div>
      {inviteUrl ? <div className="share-card-invite"><span>JOIN THIS LEADERBOARD</span><span>{inviteUrl}</span></div> : null}
    </div>
  </div>;
});
