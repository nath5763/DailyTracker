import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { GameStatsList } from "@/components/game-stats";
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
    <div className="page-heading"><div><p className="section-number">YOUR OVERVIEW</p><h1>Hey, {data.profile.displayName}.</h1></div><Link className="button" href="/submit">Add today&apos;s score <span>-&gt;</span></Link></div>
    <GameStatsList values={data.statsByGame} />
    <div className="spacer" /><div className="grid grid-2">
      <section className="card"><h2>Recent scores</h2>{data.recentScores.length ? <div className="list">{data.recentScores.map((row) => <div className="list-row" key={row.id}><span className="rank">#{row.puzzleKey}</span><span>{row.gameName}<small>{row.playedOn}</small></span><strong>{formatScore(row.primaryScore, row.game.scoreFormat)}</strong></div>)}</div> : <div className="empty">No scores yet. Paste your first daily result.</div>}</section>
      <section className="card"><h2>Your leaderboards</h2>{data.leaderboards.length ? <div className="list">{data.leaderboards.map((board) => board.locked ? <div className="list-row locked-row" key={board.id}><span className="rank">LOCK</span><span>{board.name}<small>{board.game.name} · {board.owner ? "Owned by you" : "Shared with you"}</small></span><strong>Locked</strong></div> : <Link className="list-row" href={`/leaderboards/${board.id}`} key={board.id}><span className="rank">OPEN</span><span>{board.name}<small>{board.game.name} · {board.owner ? "Owned by you" : "Shared with you"}</small></span><strong>View</strong></Link>)}</div> : <div className="empty">Create your first leaderboard for free.</div>}<div className="spacer" /><Link className="text-button" href="/leaderboards">Manage leaderboards</Link></section>
    </div>
    <div className="spacer" /><section className="card" id="account-uuid"><p className="field-label">Your shareable account UUID</p><div className="uuid-box">{data.profile.shareId}</div><CopyButton value={data.profile.shareId} /></section>
  </section></main>;
}
