"use client";

import { Fragment, useState } from "react";
import { AppLink } from "@/components/app-link";
import { avatarBackground } from "@/lib/avatar-color";
import { useAppData } from "@/components/app-data-provider";
import { CopyLeaderboard } from "@/components/copy-leaderboard";
import { LeaderboardInsightsView } from "@/components/leaderboard-insights";
import { LeaderboardPosition, LeaderboardPodium } from "@/components/leaderboard-highlights";
import { LeaderboardMemberScoresPanel, memberScoresPanelId, nextExpandedPlayer, type ExpandedPlayer } from "@/components/leaderboard-member-scores";
import { LeaderboardDiscord } from "@/components/leaderboard-discord";
import { LeaderboardInvite } from "@/components/leaderboard-invite";
import { DiscordLinkInstructions } from "@/components/discord-link-instructions";
import { DeleteLeaderboard } from "@/components/delete-leaderboard";
import { LeaderboardGameSelector, readLastSelectedLeaderboardGame } from "@/components/leaderboard-game-selector";
import { MemberManager, RemoveMemberButton } from "@/components/member-manager";
import { ManageBillingButton, SubscriptionChoices } from "@/components/billing-actions";
import { invalidateClientCachePrefix, leaderboardCachePath, useCachedApi } from "@/lib/client-cache";
import { formatRankingScore, formatResultDetails } from "@/lib/format";
import type { BillingStatus, BoardSummary, Leaderboard } from "@/lib/types";

const ranges = [{ key: "today", label: "Today" }, { key: "7d", label: "Last 7 days" }, { key: "30d", label: "Last 30 days" }, { key: "all", label: "All time" }] as const;
const backToBoards = <AppLink className="button button-ghost" href="/leaderboards">Back to all leaderboards</AppLink>;

export function LeaderboardDetail({ id, requestedGame, requestedRange, discordStatus, setupToken, joinedFromInvite = false }: { id: string; requestedGame?: string; requestedRange?: string; discordStatus?: string; setupToken?: string; joinedFromInvite?: boolean }) {
  const summaries = useCachedApi<BoardSummary[]>("/leaderboards");
  const summary = summaries.data?.find((candidate) => candidate.id === id);
  const games = summary?.games?.length ? summary.games : summary?.game ? [summary.game] : [];
  const savedGame = !requestedGame ? games.find(candidate => candidate.slug === readLastSelectedLeaderboardGame(id)) : undefined;
  const requested = games.find((candidate) => candidate.slug === requestedGame);
  const gameSlug = requestedGame ? (requested ?? games[0])?.slug :
    savedGame?.slug ?? (summary?.boardType === "MULTI_GAME" ? undefined : games[0]?.slug);
  const range = ranges.find((candidate) => candidate.key === requestedRange)?.key ?? "today";
  const path = games.length && !summary?.locked ? leaderboardCachePath(id, gameSlug, range) : "";
  return <Content key={path || id} id={id} path={path} range={range} summary={summary} summaries={summaries} discordStatus={discordStatus} setupToken={setupToken} joinedFromInvite={joinedFromInvite} />;
}

function Content({ id, path, range, summary, summaries, discordStatus, setupToken, joinedFromInvite }: { id: string; path: string; range: string; summary?: BoardSummary; summaries: ReturnType<typeof useCachedApi<BoardSummary[]>>; discordStatus?: string; setupToken?: string; joinedFromInvite: boolean }) {
  const { userId } = useAppData();
  const result = useCachedApi<Leaderboard>(path, { storage: "memory", enabled: !!path });
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const [insightsVersion, setInsightsVersion] = useState(0);
  const [expanded, setExpanded] = useState<ExpandedPlayer>(null);
  function togglePlayer(playerId: string, location: NonNullable<ExpandedPlayer>["location"]) {
    setExpanded(current => nextExpandedPlayer(current, playerId, location));
  }
  async function refresh() {
    setRefreshing(true);
    setRefreshError("");
    invalidateClientCachePrefix(userId, `/leaderboards/${encodeURIComponent(id)}`);
    try { if (path) await result.refresh(); else await summaries.refresh(); setInsightsVersion(value => value + 1); }
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
      {games.length > 1 ? <LeaderboardGameSelector boardId={id} games={games} selected={board.game} range={range} recentGameSlugs={board.recentGameSlugs} /> : null}
      <nav className="tabs leaderboard-range-tabs" aria-label="Leaderboard date range">{ranges.map((tab) => <AppLink className={`tab ${range === tab.key ? "active" : ""}`} aria-current={range === tab.key ? "page" : undefined} href={`/leaderboards/${id}?game=${encodeURIComponent(board.game.slug)}&range=${tab.key}`} key={tab.key}>{tab.label}</AppLink>)}</nav>
      <LeaderboardPosition board={board} userId={userId} />
      <section className="leaderboard-rankings" id="leaderboard-game-results" aria-label="Leaderboard rankings"><h2>Leaderboard</h2>
        {!board.rankings.length ? <div className="empty">Nobody has posted a score for this range yet.</div> : null}
        {board.rankings.length || board.absent.length ? <div className="list">{board.rankings.map((row) => {
          const panelId = memberScoresPanelId(row.userId, "ranking");
          const open = expanded?.userId === row.userId && expanded.location === "ranking";
          const resultDetails = range === "today" ? formatResultDetails(board.dailyResults?.find(result => result.userId === row.userId)?.details) : "";
          return <Fragment key={row.userId}><button className="list-row leaderboard-player-toggle" type="button" aria-expanded={open} aria-controls={panelId} onClick={() => togglePlayer(row.userId, "ranking")}><span className="rank">{String(row.rank).padStart(2, "0")}</span><span>{row.displayName}<small>{row.gamesPlayed} score{row.gamesPlayed === 1 ? "" : "s"} in this range{row.manualResults ? ` · ${row.manualResults} manual · unverified` : ""}{range !== "today" && row.assistedResults ? ` · ${row.assistedResults} assisted (${row.hints ?? 0} hints, ${row.mistakes ?? 0} mistakes, ${row.beginnerAssists ?? 0} beginner assists)` : ""}{range !== "today" && row.unknownAssistanceResults ? ` · ${row.unknownAssistanceResults} with assistance details unavailable` : ""}</small>{resultDetails ? <small className="daily-result-details">{resultDetails}</small> : null}</span><strong>{formatRankingScore(row, board.game)}</strong></button>{open ? <LeaderboardMemberScoresPanel boardId={board.id} userId={row.userId} shareId={row.shareId} game={board.game} range={range} panelId={panelId} /> : null}</Fragment>;
        })}{board.absent.map((member) => <div className="list-row" key={member.userId}><span className="rank">--</span><span>{member.displayName}<small>Not played</small></span><strong>--</strong></div>)}</div> : null}
        <LeaderboardPodium board={board} expanded={expanded} onToggle={togglePlayer} />
      </section>
      {board.boardType === "MULTI_GAME" && board.combinedRankings?.length ? <section className="leaderboard-rankings" aria-label="Combined leaderboard rankings"><h2>Combined standings</h2><p className="subtle">Placement points compare players only within the same game and puzzle. First place earns 100 points; each subsequent place earns 20% less than the previous place, rounded down. Failed results earn no performance points; participation remains separate.</p><div className="list">{board.combinedRankings.map((row) => {
        const panelId = memberScoresPanelId(row.userId, "combined");
        const open = expanded?.userId === row.userId && expanded.location === "combined";
        return <Fragment key={row.userId}><button className="list-row leaderboard-player-toggle" type="button" aria-expanded={open} aria-controls={panelId} onClick={() => togglePlayer(row.userId, "combined")}><span className="rank">{String(row.rank).padStart(2, "0")}</span><span>{row.displayName}<small>{row.participationPoints ?? row.gamesPlayed} participation point{(row.participationPoints ?? row.gamesPlayed) === 1 ? "" : "s"}{row.manualResults ? ` · ${row.manualResults} manual · unverified` : ""}</small></span><strong>{row.displayScore ?? `${row.leaderboardPoints ?? row.average} leaderboard pts`}</strong></button>{open ? <LeaderboardMemberScoresPanel boardId={board.id} userId={row.userId} shareId={row.shareId} game={board.game} range={range} panelId={panelId} /> : null}</Fragment>;
      })}</div></section> : null}
      <LeaderboardInsightsView key={`${board.game.slug}-${insightsVersion}-${board.members.map(member => member.userId).join(",")}`} boardId={id} game={board.game} />
    </section><aside className="card" id="leaderboard-roster-management">{board.owner ? <><h2>Manage players</h2><LeaderboardInvite boardId={id} /><div className="spacer" /><p className="subtle">Add an existing account using its exact UUID.</p><MemberManager leaderboardId={id} onChanged={() => void result.refresh()} /><div className="spacer" /><div className="list">{board.members.map((member) => <div className="list-row" key={member.userId}><span className="avatar small" style={{ background: avatarBackground(member.avatarColor) }}>{member.displayName[0].toUpperCase()}</span><span>{member.displayName}<small>{member.owner ? "Owner" : "Member"}</small></span>{!member.owner ? <RemoveMemberButton leaderboardId={id} userId={member.userId} onChanged={() => void result.refresh()} /> : <strong>★</strong>}</div>)}</div></> : <><h2>Club roster</h2><div className="list">{board.members.map((member) => <div className="list-row" key={member.userId}><span className="avatar small" style={{ background: avatarBackground(member.avatarColor) }}>{member.displayName[0].toUpperCase()}</span><span>{member.displayName}</span><strong>{member.owner ? "Owner" : ""}</strong></div>)}</div></>}</aside></div>
    {joinedFromInvite ? <><div className="spacer" /><DiscordLinkInstructions afterJoin /></> : null}
    <div className="spacer" />{board.boardType === "MULTI_GAME"
      ? <LeaderboardDiscord boardId={id} owner={board.owner} discordStatus={discordStatus} setupToken={setupToken} />
      : <section className="card"><h2>Discord requires a multi-game leaderboard</h2><p className="subtle">Create a multi-game leaderboard to connect a server channel or Group DM. Discord commands require you to choose a game.</p><AppLink className="secondary-link" href="/leaderboards">View your leaderboards</AppLink></section>}
    <div className="spacer" /><section className="card" id="leaderboard-roster-copy"><h2>Use this group for another game</h2><p className="subtle">Create a new leaderboard with the same players. You will own the new board.</p><CopyLeaderboard leaderboardId={id} sourceName={board.name} sourceGameSlug={board.game.slug} /></section>
    {board.owner ? <><div className="spacer" /><DeleteLeaderboard boardId={id} name={board.name} /></> : null}
  </section>;
}

function Locked({ board, refreshing, refresh }: { board: BoardSummary; refreshing: boolean; refresh: () => Promise<void> }) {
  const billing = useCachedApi<BillingStatus>("/billing/status");
  return <section className="page shell"><div className="page-heading"><div><p className="section-number">{board.game?.name.toUpperCase() ?? "PRIVATE"} LEADERBOARD</p><h1>{board.name}</h1></div><div className="heading-actions">{backToBoards}<button className="button button-ghost" disabled={refreshing} onClick={() => void refresh()}>{refreshing ? "Refreshing…" : "Refresh leaderboard"}</button></div></div><section className="card locked-card"><span className="lock-mark" aria-hidden="true">LOCKED</span><h2>This all-game leaderboard is currently locked.</h2><p>{board.owner ? "Restore a paid tier to reopen its rankings and roster for everyone." : "The owner needs to restore a paid tier before members can view rankings or the roster."}</p>{board.owner ? <div className="billing-buttons" id="locked-board-billing-controls">{!billing.data?.status || billing.data.status === "canceled" || billing.data.status === "incomplete_expired" ? <SubscriptionChoices /> : <ManageBillingButton />}</div> : null}</section>{board.owner ? <><section className="card"><LeaderboardInvite boardId={board.id} locked /></section><div className="spacer" /><DeleteLeaderboard boardId={board.id} name={board.name} /></> : null}</section>;
}


