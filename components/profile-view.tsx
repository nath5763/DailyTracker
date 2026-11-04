"use client";

import { CopyButton } from "@/components/copy-button";
import { GameStatsList } from "@/components/game-stats";
import { useCachedApi } from "@/lib/client-cache";
import { formatScore } from "@/lib/format";
import type { PlayerProfile } from "@/lib/types";

export function ProfileView({ shareId }: { shareId: string }) {
  const { data, error, errorStatus, refresh } = useCachedApi<PlayerProfile>(`/profiles/${encodeURIComponent(shareId)}`, { storage: "memory" });
  if (!data) return <section className="page shell"><div className="card"><p>{errorStatus === 404 ? "Player not found." : error || "Loading profile…"}</p>{error && errorStatus !== 404 ? <button className="button button-ghost" onClick={() => void refresh()}>Retry</button> : null}</div></section>;
  return <section className="page shell">
    <div className="page-heading"><div className="profile-top"><span className="avatar" style={{ background: data.profile.avatarColor }}>{data.profile.displayName[0].toUpperCase()}</span><div><p className="section-number">PLAYER PROFILE</p><h1>{data.profile.displayName}</h1></div></div><p>{data.self ? "This is your profile." : "You share a private leaderboard with this player."}</p></div>
    <GameStatsList values={data.statsByGame} />
    <div className="spacer" /><div className="grid grid-2"><section className="card"><h2>Score history</h2>{data.scores.length ? <div className="list">{data.scores.map((row) => <div className="list-row" key={row.id}><span className="rank">#{row.puzzleKey}</span><span>{row.gameName}<small>{row.playedOn}</small></span><strong>{formatScore(row.primaryScore, row.game.scoreFormat)}</strong></div>)}</div> : <div className="empty">No submitted games yet.</div>}</section><aside className="card"><h2>Account UUID</h2><p className="subtle">Leaderboard owners use this identifier to add the account.</p><div className="uuid-box">{data.profile.shareId}</div><CopyButton value={data.profile.shareId} /></aside></div>
  </section>;
}
