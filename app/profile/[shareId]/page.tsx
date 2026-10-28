import { notFound } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { SiteHeader } from "@/components/site-header";
import { ApiError, apiFetch } from "@/lib/api";
import { requireViewer } from "@/lib/auth";
import { formatScore } from "@/lib/format";
import type { PlayerProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: Promise<{ shareId: string }> }) {
  await requireViewer();
  const { shareId } = await params;
  let data: PlayerProfile;
  try { data = await apiFetch<PlayerProfile>(`/profiles/${shareId}`); }
  catch (error) { if (error instanceof ApiError && error.status === 404) notFound(); throw error; }
  return <main className="app-shell"><SiteHeader /><section className="page shell">
    <div className="page-heading"><div className="profile-top"><span className="avatar" style={{ background: data.profile.avatarColor }}>{data.profile.displayName[0].toUpperCase()}</span><div><p className="section-number">PLAYER PROFILE</p><h1>{data.profile.displayName}</h1></div></div><p>{data.self ? "This is your profile." : "You share a private leaderboard with this player."}</p></div>
    <div className="grid grid-3"><article className="card card-purple"><span className="metric-label">Average</span><strong className="metric">{formatScore(data.stats.average)}</strong></article><article className="card"><span className="metric-label">Best score</span><strong className="metric">{formatScore(data.stats.best)}</strong></article><article className="card card-lime"><span className="metric-label">Current streak</span><strong className="metric">{data.stats.currentStreak}</strong></article></div>
    <div className="spacer" /><div className="grid grid-2"><section className="card"><h2>Score history</h2>{data.scores.length ? <div className="list">{data.scores.map((row) => <div className="list-row" key={row.id}><span className="rank">#{row.puzzleKey}</span><span>{row.gameName}<small>{row.playedOn}</small></span><strong>{formatScore(row.primaryScore)}</strong></div>)}</div> : <div className="empty">No submitted games yet.</div>}</section><aside className="card"><h2>Account UUID</h2><p className="subtle">Leaderboard owners use this identifier to add the account.</p><div className="uuid-box">{data.profile.shareId}</div><CopyButton value={data.profile.shareId} /></aside></div>
  </section></main>;
}
