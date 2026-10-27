import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { SiteHeader } from "@/components/site-header";
import { requireViewer } from "@/lib/auth";
import { todayInTimeZone } from "@/lib/dates";
import { currentStreak } from "@/lib/leaderboards";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

type Submission = { id: string; played_on: string; primary_score: number; puzzle_key: string; games: { name: string; slug: string } | null };

export default async function DashboardPage() {
  const { supabase, profile } = await requireViewer();
  const [{ data: submissions }, { data: groups }] = await Promise.all([
    supabase!.from("submissions").select("id,played_on,primary_score,puzzle_key,games(name,slug)").eq("user_id", profile.user_id).order("played_on", { ascending: false }).limit(30),
    supabase!.from("leaderboard_members").select("leaderboard_id,leaderboards(id,name,owner_id)").eq("user_id", profile.user_id),
  ]);
  const rows = (submissions ?? []) as unknown as Submission[];
  const average = rows.length ? rows.reduce((sum, row) => sum + Number(row.primary_score), 0) / rows.length : null;
  const best = rows.length ? Math.min(...rows.map((row) => Number(row.primary_score))) : null;
  const streak = currentStreak(rows.map((row) => row.played_on), todayInTimeZone());

  return (
    <main className="app-shell">
      <SiteHeader />
      <section className="page shell">
        <div className="page-heading">
          <div><p className="section-number">YOUR OVERVIEW</p><h1>Hey, {profile.display_name}.</h1></div>
          <Link className="button" href="/submit">Add today’s score <span>→</span></Link>
        </div>

        <div className="grid grid-3">
          <article className="card card-purple"><span className="metric-label">All-time average</span><strong className="metric">{average ? `${average.toFixed(2)}×` : "—"}</strong><span>{rows.length} result{rows.length === 1 ? "" : "s"} logged</span></article>
          <article className="card"><span className="metric-label">Personal best</span><strong className="metric">{best ? `${best.toFixed(2)}×` : "—"}</strong><span>Lower is better</span></article>
          <article className="card card-lime"><span className="metric-label">Current streak</span><strong className="metric">{streak}</strong><span>consecutive day{streak === 1 ? "" : "s"}</span></article>
        </div>

        <div className="spacer" />
        <div className="grid grid-2">
          <section className="card">
            <h2>Recent scores</h2>
            {rows.length ? <div className="list">{rows.slice(0, 7).map((row) => <div className="list-row" key={row.id}><span className="rank">#{row.puzzle_key}</span><span>{row.games?.name ?? "Daily game"}<small>{row.played_on}</small></span><strong>{Number(row.primary_score).toFixed(2)}×</strong></div>)}</div> : <div className="empty">No scores yet. Paste your first Fermi result.</div>}
          </section>
          <section className="card">
            <h2>Your clubs</h2>
            {(groups ?? []).length ? <div className="list">{(groups ?? []).map((membership: any) => { const board = Array.isArray(membership.leaderboards) ? membership.leaderboards[0] : membership.leaderboards; return board ? <Link className="list-row" href={`/leaderboards/${board.id}`} key={board.id}><span className="rank">↗</span><span>{board.name}<small>{board.owner_id === profile.user_id ? "You own this board" : "Shared with you"}</small></span><strong>View</strong></Link> : null; })}</div> : <div className="empty">Your default friends leaderboard will appear here.</div>}
            <div className="spacer" /><Link className="text-button" href="/leaderboards">Manage leaderboards</Link>
          </section>
        </div>

        <div className="spacer" />
        <section className="card">
          <p className="field-label">Your shareable account UUID</p>
          <div className="uuid-box">{profile.share_id}</div>
          <CopyButton value={profile.share_id} />
        </section>
      </section>
    </main>
  );
}
