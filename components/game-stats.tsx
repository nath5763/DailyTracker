import { formatScore } from "@/lib/format";
import type { GameStats } from "@/lib/types";

export function GameStatsList({ values }: { values: GameStats[] }) {
  if (!values.length) return <div className="empty">No scores yet. Add a daily result to start your stats.</div>;

  return <div className="game-stats-list">{values.map((stats) => <section key={stats.game.id}>
    <div className="game-stats-heading"><h2>{stats.game.name}</h2><span>{stats.game.rankingDirection === "lower" ? "Lower is better" : "Higher is better"}</span></div>
    <div className="grid grid-3">
      <article className="card card-purple"><span className="metric-label">All-time average</span><strong className="metric">{formatScore(stats.average, stats.game.scoreFormat)}</strong><span>{stats.results} result{stats.results === 1 ? "" : "s"} logged</span></article>
      <article className="card"><span className="metric-label">Personal best</span><strong className="metric">{formatScore(stats.best, stats.game.scoreFormat)}</strong><span>{stats.game.rankingDirection === "lower" ? "Lowest score" : "Highest score"}</span></article>
      <article className="card card-lime"><span className="metric-label">Current streak</span><strong className="metric">{stats.currentStreak}</strong><span>consecutive day{stats.currentStreak === 1 ? "" : "s"}</span></article>
    </div>
  </section>)}</div>;
}
