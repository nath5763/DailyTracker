"use client";

import { AppLink } from "@/components/app-link";
import { OverviewGames } from "@/components/overview-games";
import { OverviewLeaderboards } from "@/components/overview-leaderboards";
import { useCachedApi } from "@/lib/client-cache";
import type { Dashboard } from "@/lib/types";

export function DashboardView() {
  const { data, loading, error } = useCachedApi<Dashboard>("/dashboard");
  if (!data) return <section className="page shell"><div className="card">{loading ? "Loading overview…" : error}</div></section>;
  return <section className="page shell">
    {error ? <div className="form-message error">{error}</div> : null}
    <header className="overview-page-header"><div><h1>Overview</h1><p>Your scores and activity</p></div><AppLink className="button" href="/submit">Add score <span aria-hidden="true">→</span></AppLink></header>
    <OverviewGames values={data.statsByGame} />
    <OverviewLeaderboards values={data.leaderboards} />
  </section>;
}


