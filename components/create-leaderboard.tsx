"use client";

import { useState } from "react";
import { navigateInApp } from "@/components/app-link";
import { SubscribeButton } from "@/components/billing-actions";
import { useAppData } from "@/components/app-data-provider";
import { invalidateClientCache } from "@/lib/client-cache";
import type { BillingStatus, Game } from "@/lib/types";

export function CreateLeaderboard({ games, billing }: { games: Game[]; billing: BillingStatus }) {
  const { userId } = useAppData();
  const [name, setName] = useState("");
  const [gameSlug, setGameSlug] = useState(games[0]?.slug ?? "");
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
      body: JSON.stringify({ name, gameSlug }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error ?? "Could not create leaderboard.");
      setSubscriptionRequired(data.code === "SUBSCRIPTION_REQUIRED");
      setLoading(false);
      return;
    }
    invalidateClientCache(userId, ["/dashboard", "/leaderboards", "/billing/status"]);
    navigateInApp(`/leaderboards/${data.id}`);
  }

  if (!games.length) return <div className="empty">No games are currently available.</div>;

  return <div className="form-stack"><form className="form-stack" onSubmit={submit}>
    <div className="field"><label htmlFor="board-name">Leaderboard name</label><input id="board-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Friday lunch crew" minLength={2} maxLength={48} required /></div>
    <div className="field"><label htmlFor="board-game">Daily game</label><select id="board-game" value={gameSlug} onChange={(event) => setGameSlug(event.target.value)} required>{games.map((game) => <option key={game.id} value={game.slug}>{game.name}</option>)}</select></div>
    <button className="button" disabled={loading || !gameSlug} type="submit">{loading ? "Creating..." : "Create leaderboard"}</button>
    {message ? <div className="form-message error">{message}</div> : null}
  </form>
    {subscriptionRequired ? <SubscribeButton /> : null}
    {!billing.freeLeaderboardAvailable && !billing.unlimitedLeaderboards && !subscriptionRequired ? <p className="subtle">Your five free leaderboards have been used. Subscribe to create more.</p> : null}
  </div>;
}
