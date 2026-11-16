"use client";

import { CopyButton } from "@/components/copy-button";
import { DiscordCard } from "@/components/discord-card";
import { TelegramCard } from "@/components/telegram-card";
import { WeChatCard } from "@/components/wechat-card";
import { GameStatsList } from "@/components/game-stats";
import { SubscriptionPanel } from "@/components/subscription-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { useCachedApi } from "@/lib/client-cache";
import { formatResultScore } from "@/lib/format";
import { avatarBackground } from "@/lib/avatar-color";
import type { PlayerProfile } from "@/lib/types";

export function ProfileView({ shareId, checkout, billingReturn }: { shareId: string; checkout?: string; billingReturn?: string }) {
  const { data, error, errorStatus, refresh } = useCachedApi<PlayerProfile>(`/profiles/${encodeURIComponent(shareId)}`, { storage: "memory" });
  if (!data) return <section className="page shell"><div className="card"><p>{errorStatus === 404 ? "Player not found." : error || "Loading profile…"}</p>{error && errorStatus !== 404 ? <button className="button button-ghost" onClick={() => void refresh()}>Retry</button> : null}</div></section>;
  return <section className="page shell">
    <div className="page-heading"><div className="profile-top"><span className="avatar" style={{ background: avatarBackground(data.profile.avatarColor) }}>{data.profile.displayName[0].toUpperCase()}</span><div><p className="section-number">PLAYER PROFILE</p><h1>{data.profile.displayName}</h1></div></div><div className="profile-identity" id="account-uuid"><p>{data.self ? "This is your profile." : "You share a private leaderboard with this player."}</p><div className="profile-id-row"><span className="section-number">ACCOUNT ID</span><code>{data.profile.shareId}</code><CopyButton value={data.profile.shareId} label="Copy account ID" /></div><p className="subtle">{data.self ? "Share this ID with a leaderboard owner so they can add you." : "Leaderboard owners can use this ID to add the player."}</p></div></div>
    {data.self ? <>
      <div className="grid grid-2 profile-integrations"><DiscordCard /><TelegramCard /><WeChatCard /></div>
      <div className="spacer" /><ThemeToggle /><div className="spacer" /><SubscriptionPanel checkout={checkout} billingReturn={billingReturn} />
    </> : <>
      <GameStatsList values={data.statsByGame} />
      <div className="spacer" /><section className="card"><h2>Score history</h2>{data.scores.length ? <div className="list">{data.scores.map((row) => <div className="list-row" key={row.id}><span className="rank">#{row.puzzleKey}</span><span>{row.gameName}<small>{row.playedOn}{row.submissionMethod === "MANUAL" ? " · Manual · unverified" : ""}</small></span><strong>{formatResultScore(row)}</strong></div>)}</div> : <div className="empty">No submitted games yet.</div>}</section>
    </>}
  </section>;
}
