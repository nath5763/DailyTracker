import { notFound } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { SiteHeader } from "@/components/site-header";
import { requireViewer } from "@/lib/auth";
import { todayInTimeZone } from "@/lib/dates";
import { currentStreak } from "@/lib/leaderboards";

export const dynamic = "force-dynamic";
type Submission = { id: string; puzzle_key: string; played_on: string; primary_score: number; games: { name: string } | null };

export default async function ProfilePage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const { supabase, profile: viewer } = await requireViewer();
  const { data: profile } = await supabase!.from("profiles").select("user_id,share_id,display_name,avatar_color,created_at").eq("share_id", shareId).maybeSingle();
  if (!profile) notFound();
  const { data } = await supabase!.from("submissions").select("id,puzzle_key,played_on,primary_score,games(name)").eq("user_id", profile.user_id).order("played_on", { ascending: false });
  const rows = (data ?? []) as unknown as Submission[];
  const average = rows.length ? rows.reduce((sum, row) => sum + Number(row.primary_score), 0) / rows.length : null;
  const best = rows.length ? Math.min(...rows.map((row) => Number(row.primary_score))) : null;
  const streak = currentStreak(rows.map((row) => row.played_on), todayInTimeZone());
  return <main className="app-shell"><SiteHeader /><section className="page shell"><div className="page-heading"><div className="profile-top"><span className="avatar" style={{ background: profile.avatar_color }}>{profile.display_name[0].toUpperCase()}</span><div><p className="section-number">PLAYER PROFILE</p><h1>{profile.display_name}</h1></div></div><p>{profile.user_id === viewer.user_id ? "This is your profile." : "You share a private leaderboard with this player."}</p></div><div className="grid grid-3"><article className="card card-purple"><span className="metric-label">Average</span><strong className="metric">{average ? `${average.toFixed(2)}×` : "—"}</strong></article><article className="card"><span className="metric-label">Best score</span><strong className="metric">{best ? `${best.toFixed(2)}×` : "—"}</strong></article><article className="card card-lime"><span className="metric-label">Current streak</span><strong className="metric">{streak}</strong></article></div><div className="spacer" /><div className="grid grid-2"><section className="card"><h2>Score history</h2>{rows.length ? <div className="list">{rows.map((row) => <div className="list-row" key={row.id}><span className="rank">#{row.puzzle_key}</span><span>{row.games?.name ?? "Daily game"}<small>{row.played_on}</small></span><strong>{Number(row.primary_score).toFixed(2)}×</strong></div>)}</div> : <div className="empty">No submitted games yet.</div>}</section><aside className="card"><h2>Account UUID</h2><p className="subtle">Leaderboard owners use this identifier to add the account.</p><div className="uuid-box">{profile.share_id}</div><CopyButton value={profile.share_id} /></aside></div></section></main>;
}
