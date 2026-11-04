"use client";

import { useCallback, useEffect, useState } from "react";
import { AppLink } from "@/components/app-link";
import { ManageBillingButton, SubscribeButton } from "@/components/billing-actions";
import { CreateLeaderboard } from "@/components/create-leaderboard";
import { useAppData } from "@/components/app-data-provider";
import { invalidateClientCache, useCachedApi } from "@/lib/client-cache";
import type { BillingStatus, BoardSummary } from "@/lib/types";

export function LeaderboardsView({ checkout }: { checkout?: string }) {
  const { userId, games } = useAppData();
  const boardsResult = useCachedApi<BoardSummary[]>("/leaderboards");
  const billingResult = useCachedApi<BillingStatus>("/billing/status");
  const refreshBoards = boardsResult.refresh;
  const refreshBilling = billingResult.refresh;
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const refresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshError("");
    try {
      await Promise.all([refreshBoards(), refreshBilling()]);
      invalidateClientCache(userId, ["/dashboard"]);
    }
    catch (cause) { setRefreshError(cause instanceof Error ? cause.message : "Could not refresh leaderboards."); }
    finally { setRefreshing(false); }
  }, [refreshBoards, refreshBilling, userId]);

  useEffect(() => {
    if (checkout !== "success" || billingResult.data?.unlimitedLeaderboards) return;
    let attempts = 0;
    let cancelled = false;
    let timer: number;
    const poll = async () => {
      attempts += 1;
      try {
        const updated = await refreshBilling();
        if (!cancelled && updated.unlimitedLeaderboards) {
          await refreshBoards();
          invalidateClientCache(userId, ["/dashboard"]);
          return;
        }
      } catch { /* The visible refresh controls remain available if Stripe is delayed. */ }
      if (!cancelled && attempts < 30) timer = window.setTimeout(() => void poll(), 2000);
    };
    timer = window.setTimeout(() => void poll(), 2000);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [checkout, billingResult.data?.unlimitedLeaderboards, refreshBilling, refreshBoards, userId]);

  const boards = boardsResult.data;
  const billing = billingResult.data;
  if (!boards || !billing) return <section className="page shell"><div className="card">
    <p>{boardsResult.error || billingResult.error || "Loading leaderboards…"}</p>
    {boardsResult.error || billingResult.error ? <button className="button button-ghost" type="button" disabled={refreshing} onClick={() => void refresh()}>Retry</button> : null}
  </div></section>;

  const boardsByGame = boards.reduce((groups, board) => {
    const existing = groups.get((board.game?.name ?? "Multiple games")) ?? [];
    existing.push(board);
    groups.set((board.game?.name ?? "Multiple games"), existing);
    return groups;
  }, new Map<string, BoardSummary[]>());
  const grouped = Array.from(boardsByGame.entries()).sort(([left], [right]) => left.localeCompare(right));

  return <section className="page shell">
    {checkout === "success" ? <div className="notice">{billing.unlimitedLeaderboards ? "Subscription active. You can create unlimited leaderboards." : "Payment received. Waiting for Stripe to confirm your subscription…"}</div> : null}
    {checkout === "cancelled" ? <div className="notice">Checkout was cancelled. Your existing leaderboards were not changed.</div> : null}
    {refreshError || boardsResult.error || billingResult.error ? <div className="form-message error">{refreshError || boardsResult.error || billingResult.error}</div> : null}
    <div className="page-heading"><div><p className="section-number">PRIVATE LEADERBOARDS</p><h1>Your leaderboards.</h1></div><div className="heading-actions"><p>Every leaderboard belongs to one daily game. Groups are visible only to their members.</p><button className="button button-ghost" type="button" disabled={refreshing} onClick={() => void refresh()}>{refreshing ? "Refreshing…" : "Refresh leaderboards"}</button></div></div>
    <div className="grid leaderboard-layout"><section className="card"><h2>Boards by game</h2>{grouped.length ? <div className="game-groups">{grouped.map(([gameName, gameBoards]) => <section className="game-group" key={gameName}><div className="game-group-heading"><h3>{gameName}</h3><span>{gameBoards.length} board{gameBoards.length === 1 ? "" : "s"}</span></div><div className="list">{gameBoards.map((board) => board.locked ? <div className="list-row locked-row" key={board.id}><span className="rank" aria-hidden="true">LOCK</span><span>{board.name}<small>{board.owner ? "You own this board" : "Shared with you"}</small></span><strong>{board.owner ? "Renew" : "Locked"}</strong></div> : <AppLink className="list-row" href={`/leaderboards/${board.id}`} key={board.id}><span className="rank">OPEN</span><span>{board.name}<small>{board.owner ? "You own this board" : "Shared with you"}</small></span><strong>View</strong></AppLink>)}</div></section>)}</div> : <div className="empty">No leaderboards yet. Create your first one for free.</div>}</section>
      <aside className="form-stack"><section className="card card-lime"><h2>Create a leaderboard</h2><p>Your first five leaderboards are free for life. A subscription unlocks unlimited boards.</p><CreateLeaderboard games={games} billing={billing} /></section>
        <section className="card"><p className="section-number">BILLING</p>{billing.unlimitedLeaderboards ? <><h2>Unlimited boards active</h2><p className="subtle">Your $2 monthly subscription lets you create as many game-specific leaderboards as you want.</p>{billing.cancelAtPeriodEnd && billing.currentPeriodEnd ? <div className="form-message">Access continues through {new Date(billing.currentPeriodEnd).toLocaleDateString()}.</div> : null}<ManageBillingButton /></> : billing.freeLeaderboardAvailable ? <><h2>Five boards are free</h2><p className="subtle">You can subscribe now or wait until you want to create more than five leaderboards.</p><SubscribeButton /></> : <><h2>Create unlimited boards</h2><p className="subtle">Subscribe for a flat $2 per month. Your payment details stay with Stripe.</p>{billing.graceUntil ? <div className="form-message error">Payment needs attention before {new Date(billing.graceUntil).toLocaleDateString()}.</div> : null}<SubscribeButton />{billing.status ? <ManageBillingButton /> : null}</>}</section>
      </aside></div>
  </section>;
}


