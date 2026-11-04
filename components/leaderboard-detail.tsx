"use client";

import { useState } from "react";
import { AppLink } from "@/components/app-link";
import { useAppData } from "@/components/app-data-provider";
import { CopyLeaderboard } from "@/components/copy-leaderboard";
import { MemberManager, RemoveMemberButton } from "@/components/member-manager";
import { ManageBillingButton, SubscriptionChoices } from "@/components/billing-actions";
import { invalidateClientCachePrefix, leaderboardCachePath, useCachedApi } from "@/lib/client-cache";
import { formatScore } from "@/lib/format";
import type { BillingStatus, BoardSummary, Leaderboard } from "@/lib/types";

const ranges = [{ key: "today", label: "Today" }, { key: "7d", label: "Last 7 days" }, { key: "30d", label: "Last 30 days" }, { key: "all", label: "All time" }] as const;
const backToBoards = <AppLink className="button button-ghost" href="/leaderboards">Back to all leaderboards</AppLink>;

export function LeaderboardDetail({ id, requestedGame, requestedRange }: { id: string; requestedGame?: string; requestedRange?: string }) {
  const summaries = useCachedApi<BoardSummary[]>("/leaderboards");
  const summary = summaries.data?.find((candidate) => candidate.id === id);
  const games = summary?.games?.length ? summary.games : summary?.game ? [summary.game] : [];
  const game = games.find((candidate) => candidate.slug === requestedGame) ?? games[0];
  const range = ranges.find((candidate) => candidate.key === requestedRange)?.key ?? "today";
  const path = game && !summary?.locked ? leaderboardCachePath(id, game.slug, range) : "";
  return <Content key={path || id} id={id} path={path} range={range} summary={summary} summaries={summaries} />;
}

function Content({ id, path, range, summary, summaries }: { id: string; path: string; range: string; summary?: BoardSummary; summaries: ReturnType<typeof useCachedApi<BoardSummary[]>> }) {
  const { userId } = useAppData();
  const result = useCachedApi<Leaderboard>(path, { storage: "memory", enabled: !!path });
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  async function refresh() {
    setRefreshing(true);
    setRefreshError("");
    invalidateClientCachePrefix(userId, `/leaderboards/${encodeURIComponent(id)}?`);
    try { if (path) await result.refresh(); else await summaries.refresh(); }
    catch (cause) { setRefreshError(cause instanceof Error ? cause.message : "Could not refresh leaderboard."); }
    finally { setRefreshing(false); }
  }
  if (!summaries.data) return <section className="page shell"><div className="card">{summaries.error || "Loading leaderboard…"}</div><div className="spacer" />{backToBoards}</section>;
  if (!summary) return <section className="page shell"><div className="card">Leaderboard not found.</div><div className="spacer" />{backToBoards}</section>;
  if (summary.locked || result.errorStatus === 402) return <Locked board={summary} refreshing={refreshing} refresh={refresh} />;
  if (!path) return <section className="page shell"><div className="card">No games are available for this leaderboard.</div><div className="spacer" />{backToBoards}</section>;
  const board = result.data;
  if (!board) return <section className="page shell"><div className="card"><p>{refreshError || result.error || "Loading leaderboard…"}</p>{result.error ? <button className="button button-ghost" onClick={() => void refresh()}>Retry</button> : null}</div><div className="spacer" />{backToBoards}</section>;
  const scoring = board.game.rankingDirection === "lower" ? "Lower average wins." : "Higher average wins.";
  const games = board.games?.length ? board.games : [board.game];
  return <section className="page shell">
    <div className="page-heading"><div><p className="section-number">{board.game.name.toUpperCase()} LEADERBOARD</p><h1>{board.name}</h1></div><div className="heading-actions"><p>{board.members.length} player{board.members.length === 1 ? "" : "s"} · {scoring} <a className="secondary-link" href={board.game.sourceUrl} rel="noreferrer" target="_blank">Play {board.game.name}</a></p>{backToBoards}<button className="button button-ghost" disabled={refreshing} onClick={() => void refresh()}>{refreshing ? "Refreshing…" : "Refresh leaderboard"}</button></div></div>
    {refreshError ? <div className="form-message error">{refreshError}</div> : null}
    <div className="grid score-layout"><section className="card">
      {games.length > 1 ? <div className="tabs">{games.map((game) => <AppLink className={`tab ${game.slug === board.game.slug ? "active" : ""}`} href={`/leaderboards/${id}?game=${encodeURIComponent(game.slug)}&range=${range}`} key={game.slug}>{game.name}</AppLink>)}</div> : null}
      <div className="tabs">{ranges.map((tab) => <AppLink className={`tab ${range === tab.key ? "active" : ""}`} href={`/leaderboards/${id}?game=${encodeURIComponent(board.game.slug)}&range=${tab.key}`} key={tab.key}>{tab.label}</AppLink>)}</div>
      {board.rankings.length ? <div className="list">{board.rankings.map((row) => <AppLink className="list-row" href={`/profile/${row.shareId}`} key={row.userId}><span className="rank">{String(row.rank).padStart(2, "0")}</span><span>{row.displayName}<small>{row.gamesPlayed} score{row.gamesPlayed === 1 ? "" : "s"} in this range{range !== "today" && row.assistedResults ? ` · ${row.assistedResults} assisted (${row.hints ?? 0} hints, ${row.mistakes ?? 0} mistakes, ${row.beginnerAssists ?? 0} beginner assists)` : ""}{range !== "today" && row.unknownAssistanceResults ? ` · ${row.unknownAssistanceResults} with assistance details unavailable` : ""}</small></span><strong>{formatScore(row.average, board.game.scoreFormat)}</strong></AppLink>)}{board.absent.map((member) => <div className="list-row" key={member.userId}><span className="rank">--</span><span>{member.displayName}<small>Not played</small></span><strong>--</strong></div>)}</div> : <div className="empty">Nobody has posted a score for this range yet.</div>}
    </section><aside className="card" id="leaderboard-roster-management">{board.owner ? <><h2>Manage players</h2><p className="subtle">Add an existing account using its exact UUID.</p><MemberManager leaderboardId={id} onChanged={() => void result.refresh()} /><div className="spacer" /><div className="list">{board.members.map((member) => <div className="list-row" key={member.userId}><span className="avatar small" style={{ background: member.avatarColor }}>{member.displayName[0].toUpperCase()}</span><span>{member.displayName}<small>{member.owner ? "Owner" : "Member"}</small></span>{!member.owner ? <RemoveMemberButton leaderboardId={id} userId={member.userId} onChanged={() => void result.refresh()} /> : <strong>★</strong>}</div>)}</div></> : <><h2>Club roster</h2><div className="list">{board.members.map((member) => <div className="list-row" key={member.userId}><span className="avatar small" style={{ background: member.avatarColor }}>{member.displayName[0].toUpperCase()}</span><span>{member.displayName}</span><strong>{member.owner ? "Owner" : ""}</strong></div>)}</div></>}</aside></div>
    <div className="spacer" /><section className="card" id="leaderboard-roster-copy"><h2>Use this group for another game</h2><p className="subtle">Create a new leaderboard with the same players. You will own the new board.</p><CopyLeaderboard leaderboardId={id} sourceName={board.name} sourceGameSlug={board.game.slug} /></section>
  </section>;
}

function Locked({ board, refreshing, refresh }: { board: BoardSummary; refreshing: boolean; refresh: () => Promise<void> }) {
  const billing = useCachedApi<BillingStatus>("/billing/status");
  return <section className="page shell"><div className="page-heading"><div><p className="section-number">{board.game?.name.toUpperCase() ?? "PRIVATE"} LEADERBOARD</p><h1>{board.name}</h1></div><div className="heading-actions">{backToBoards}<button className="button button-ghost" disabled={refreshing} onClick={() => void refresh()}>{refreshing ? "Refreshing…" : "Refresh leaderboard"}</button></div></div><section className="card locked-card"><span className="lock-mark" aria-hidden="true">LOCKED</span><h2>This all-game leaderboard is currently locked.</h2><p>{board.owner ? "Restore a paid tier to reopen its rankings and roster for everyone." : "The owner needs to restore a paid tier before members can view rankings or the roster."}</p>{board.owner ? <div className="billing-buttons" id="locked-board-billing-controls">{!billing.data?.status || billing.data.status === "canceled" || billing.data.status === "incomplete_expired" ? <SubscriptionChoices /> : <ManageBillingButton />}</div> : null}</section></section>;
}


