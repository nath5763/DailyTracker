"use client";

import { AppLink } from "@/components/app-link";
import { OverviewGames } from "@/components/overview-games";
import { useCachedApi } from "@/lib/client-cache";
import type { Dashboard } from "@/lib/types";

export function DashboardView() {
  const { data, loading, error } = useCachedApi<Dashboard>("/dashboard");
  if (!data) return <section className="page shell"><div className="card">{loading ? "Loading overview…" : error}</div></section>;
  return <section className="page shell">
    {error ? <div className="form-message error">{error}</div> : null}
    <div className="page-heading"><div><p className="section-number">YOUR OVERVIEW</p><h1>Hey, {data.profile.displayName}</h1></div><AppLink className="button" href="/submit">Add today&apos;s score <span>-&gt;</span></AppLink></div>
    <OverviewGames values={data.statsByGame} />
    <div className="spacer" /><section className="card overview-leaderboards"><h2>Your leaderboards</h2>{data.leaderboards.length ? <div className="list">{data.leaderboards.map((board) => board.locked ? <div className="list-row locked-row" key={board.id}><span className="rank">LOCK</span><span>{board.name}<small>{board.game?.name ?? "Multiple games"} · {board.owner ? "Owned by you" : "Shared with you"}</small></span><strong>Locked</strong></div> : <AppLink className="list-row" href={`/leaderboards/${board.id}`} key={board.id}><span className="rank">OPEN</span><span>{board.name}<small>{board.game?.name ?? "Multiple games"} · {board.owner ? "Owned by you" : "Shared with you"}</small></span><strong>View</strong></AppLink>)}</div> : <div className="empty">Create your first leaderboard for free.</div>}<div className="spacer" /><AppLink className="text-button" href="/leaderboards">Manage leaderboards</AppLink></section>
  </section>;
}


