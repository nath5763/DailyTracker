"use client";

import { useState } from "react";
import { navigateInApp } from "@/components/app-link";
import { ManageBillingButton, SubscriptionChoices } from "@/components/billing-actions";
import { useAppData } from "@/components/app-data-provider";
import { invalidateClientCache } from "@/lib/client-cache";
import type { BillingStatus, Game } from "@/lib/types";

export function CreateLeaderboard({ games, billing }: { games: Game[]; billing: BillingStatus }) {
  const { userId } = useAppData();
  const [name, setName] = useState("");
  const [gameSlug, setGameSlug] = useState(games[0]?.slug ?? "");
  const [boardType, setBoardType] = useState<"SINGLE_GAME" | "MULTI_GAME">("SINGLE_GAME");
  const [message, setMessage] = useState("");
  const [subscriptionRequired, setSubscriptionRequired] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setSubscriptionRequired(false);
    const response = await fetch("/api/v1/leaderboards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, boardType, ...(boardType === "SINGLE_GAME" ? { gameSlug } : {}) }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error ?? "Could not create leaderboard.");
      setSubscriptionRequired(data.code === "SUBSCRIPTION_REQUIRED" || data.code === "ALL_GAME_LIMIT_REACHED");
      setLoading(false);
      return;
    }
    invalidateClientCache(userId, ["/dashboard", "/leaderboards", "/billing/status"]);
    navigateInApp(`/leaderboards/${data.id}`);
  }

  if (!games.length) return <div className="empty">No games are currently available.</div>;

  return <div className="form-stack"><form className="form-stack" onSubmit={submit}>
    <div className="field"><label htmlFor="board-name">Leaderboard name</label><input id="board-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Friday lunch crew" minLength={2} maxLength={48} required /></div>
    <div className="field"><label htmlFor="board-type">Leaderboard type</label><select id="board-type" value={boardType} onChange={(event) => setBoardType(event.target.value as "SINGLE_GAME" | "MULTI_GAME")}><option value="SINGLE_GAME">Single game</option><option value="MULTI_GAME">All games</option></select></div>
    {boardType === "SINGLE_GAME" ? <div className="field"><label htmlFor="board-game">Daily game</label><select id="board-game" value={gameSlug} onChange={(event) => setGameSlug(event.target.value)} required>{games.map((game) => <option key={game.id} value={game.slug}>{game.name}</option>)}</select></div> : <p className="subtle">One group with rankings for every active game.</p>}
    <button className="button" disabled={loading || (boardType === "SINGLE_GAME" && !gameSlug) || (boardType === "SINGLE_GAME" ? billing.singleGameCount >= billing.singleGameLimit : billing.allGameCount >= billing.allGameLimit)} type="submit">{loading ? "Creating..." : "Create leaderboard"}</button>
    {message ? <div className="form-message error">{message}</div> : null}
  </form>
    {boardType === "SINGLE_GAME" && billing.singleGameCount >= billing.singleGameLimit ? <p className="subtle">You already own five single-game leaderboards.</p> : null}
    {boardType === "MULTI_GAME" && billing.allGameCount >= billing.allGameLimit ? <p className="subtle">{billing.tier === "FREE" ? "Choose a paid tier to create an all-game leaderboard." : "Your tier's all-game leaderboard limit has been reached."}</p> : null}
    {subscriptionRequired ? billing.tier === "FREE" ? <SubscriptionChoices /> : <ManageBillingButton /> : null}
  </div>;
}
