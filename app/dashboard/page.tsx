import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { SiteHeader } from "@/components/site-header";
import { apiFetch } from "@/lib/api";
import { requireViewer } from "@/lib/auth";
import { formatScore } from "@/lib/format";
import type { Dashboard } from "@/lib/types";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireViewer();
  const data = await apiFetch<Dashboard>("/dashboard");
  return <main className="app-shell"><SiteHeader /><section className="page shell">
    <div className="page-heading"><div><p className="section-number">YOUR OVERVIEW</p><h1>Hey, {data.profile.displayName}.</h1></div><Link className="button" href="/submit">Add today’s score <span>→</span></Link></div>
    <div className="grid grid-3">
      <article className="card card-purple"><span className="metric-label">All-time average</span><strong className="metric">{formatScore(data.stats.average)}</strong><span>{data.stats.results} result{data.stats.results === 1 ? "" : "s"} logged</span></article>
      <article className="card"><span className="metric-label">Personal best</span><strong className="metric">{formatScore(data.stats.best)}</strong><span>Lower is better</span></article>
      <article className="card card-lime"><span className="metric-label">Current streak</span><strong className="metric">{data.stats.currentStreak}</strong><span>consecutive day{data.stats.currentStreak === 1 ? "" : "s"}</span></article>
    </div>
    <div className="spacer" /><div className="grid grid-2">
      <section className="card"><h2>Recent scores</h2>{data.recentScores.length ? <div className="list">{data.recentScores.map((row) => <div className="list-row" key={row.id}><span className="rank">#{row.puzzleKey}</span><span>{row.gameName}<small>{row.playedOn}</small></span><strong>{formatScore(row.primaryScore)}</strong></div>)}</div> : <div className="empty">No scores yet. Paste your first Fermi result.</div>}</section>
      <section className="card"><h2>Your clubs</h2>{data.leaderboards.length ? <div className="list">{data.leaderboards.map((board) => <Link className="list-row" href={`/leaderboards/${board.id}`} key={board.id}><span className="rank">↗</span><span>{board.name}<small>{board.owner ? "You own this board" : "Shared with you"}</small></span><strong>View</strong></Link>)}</div> : <div className="empty">Your default friends leaderboard will appear here.</div>}<div className="spacer" /><Link className="text-button" href="/leaderboards">Manage leaderboards</Link></section>
    </div>
    <div className="spacer" /><section className="card"><p className="field-label">Your shareable account UUID</p><div className="uuid-box">{data.profile.shareId}</div><CopyButton value={data.profile.shareId} /></section>
  </section></main>;
}
