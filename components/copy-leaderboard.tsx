"use client";

import { useMemo, useState } from "react";
import { navigateInApp } from "@/components/app-link";
import { SubscribeButton } from "@/components/billing-actions";
import { useAppData } from "@/components/app-data-provider";
import { invalidateClientCache } from "@/lib/client-cache";

export function CopyLeaderboard({ leaderboardId, sourceName, sourceGameSlug }: { leaderboardId: string; sourceName: string; sourceGameSlug: string }) {
  const { userId, games } = useAppData();
  const destinations = useMemo(() => games.filter((game) => game.slug !== sourceGameSlug), [games, sourceGameSlug]);
  const [gameSlug, setGameSlug] = useState(destinations[0]?.slug ?? "");
  const [name, setName] = useState(sourceName);
  const [message, setMessage] = useState("");
  const [subscriptionRequired, setSubscriptionRequired] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setSubscriptionRequired(false);
    const response = await fetch(`/api/v1/leaderboards/${leaderboardId}/copy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, gameSlug }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error ?? "Could not copy this group.");
      setSubscriptionRequired(data.code === "SUBSCRIPTION_REQUIRED");
      setLoading(false);
      return;
    }
    invalidateClientCache(userId, ["/dashboard", "/leaderboards", "/billing/status"]);
    navigateInApp(`/leaderboards/${data.id}`);
  }

  if (!destinations.length) return <div className="empty compact-empty">More daily games are coming soon. When one is added, you can reuse this exact group in one step.</div>;

  return <div className="form-stack"><form className="form-stack" onSubmit={submit}>
    <div className="field"><label htmlFor="copy-board-name">New leaderboard name</label><input id="copy-board-name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={48} required /></div>
    <div className="field"><label htmlFor="copy-board-game">New game</label><select id="copy-board-game" value={gameSlug} onChange={(event) => setGameSlug(event.target.value)} required>{destinations.map((game) => <option key={game.id} value={game.slug}>{game.name}</option>)}</select></div>
    <button className="button" disabled={loading} type="submit">{loading ? "Copying..." : "Use this group"}</button>
    {message ? <div className="form-message error">{message}</div> : null}
  </form>{subscriptionRequired ? <SubscribeButton /> : null}</div>;
}
