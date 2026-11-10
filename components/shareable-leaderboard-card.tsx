import { forwardRef } from "react";
import { formatResultScore } from "@/lib/format";
import type { Leaderboard, LeaderboardMemberScores } from "@/lib/types";

const periods: Record<string, string> = {
  today: "Today", "7d": "Last 7 days", "30d": "Last 30 days", all: "All time",
};

export const ShareableLeaderboardCard = forwardRef<HTMLDivElement, {
  board: Leaderboard; resultsByPlayer?: Record<string, LeaderboardMemberScores>;
}>(function ShareableLeaderboardCard({ board, resultsByPlayer = {} }, ref) {
  const topPlayers = board.rankings.slice(0, 3);
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
      {topPlayers.length ? topPlayers.map((player) => {
        const results = resultsByPlayer[player.userId];
        const latest = results?.scores[0];
        return <div className={`share-card-player${player.rank === 1 ? " share-card-first" : ""}`} key={player.userId}>
          <span className="share-card-rank">#{player.rank}</span>
          <span className="share-card-name" title={player.displayName}>{player.displayName}</span>
          <div className="share-card-result">
            <span className="share-card-result-label">{board.range === "today" ? "Today’s" : "Latest"} {board.game.submission.scoreLabel || "score"}</span>
            <strong className="share-card-score">{latest ? formatResultScore(latest) : "—"}</strong>
            <span className="share-card-result-count">{results ? results.scores.length : player.gamesPlayed} result{(results ? results.scores.length : player.gamesPlayed) === 1 ? "" : "s"}</span>
          </div>
        </div>;
      }) : <div className="share-card-empty">No scores in this period yet. Your next game could start the board.</div>}
    </div>
    <div className="share-card-footer">
      <div className="share-card-brand"><span className="share-card-mark">D</span><span>Daily Tracker<small>dailytracker.cc</small></span></div>
      <div className="share-card-join"><span>MAKE YOUR OWN DAILY GAMES CLUB</span><span>Join Daily Tracker at dailytracker.cc</span></div>
    </div>
  </div>;
});
