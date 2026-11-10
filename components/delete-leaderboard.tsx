"use client";

import { useState } from "react";
import { navigateInApp } from "@/components/app-link";
import { useAppData } from "@/components/app-data-provider";
import { forgetSelectedLeaderboardGame } from "@/components/leaderboard-game-selector";
import { invalidateClientCachePrefix } from "@/lib/client-cache";

export function leaderboardNameMatches(name: string, confirmation: string) {
  return confirmation === name;
}

export function DeleteLeaderboard({ boardId, name }: { boardId: string; name: string }) {
  const { userId } = useAppData();
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const matches = leaderboardNameMatches(name, confirmation);

  async function remove(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!matches || deleting) return;
    setDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/leaderboards/${encodeURIComponent(boardId)}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(body?.message || "Could not delete the leaderboard. Try again.");
      }
      forgetSelectedLeaderboardGame(boardId);
      invalidateClientCachePrefix(userId, "/leaderboards");
      navigateInApp("/leaderboards", true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete the leaderboard. Try again.");
      setDeleting(false);
    }
  }

  return <section className="card danger-card" id="delete-leaderboard">
    <p className="section-number">DANGER ZONE</p>
    <h2>Delete leaderboard</h2>
    <p className="subtle" id={`delete-leaderboard-help-${boardId}`}>This permanently removes the leaderboard for every member, invalidates its invite link, and disconnects its Discord destinations. Player score history will not be deleted.</p>
    <form className="form-stack danger-form" onSubmit={remove}>
      <div className="field">
        <label htmlFor={`delete-leaderboard-name-${boardId}`}>Type <strong>{name}</strong> to confirm</label>
        <input id={`delete-leaderboard-name-${boardId}`} value={confirmation} onChange={(event) => setConfirmation(event.target.value)}
          aria-describedby={`delete-leaderboard-help-${boardId}`} autoComplete="off" disabled={deleting} />
      </div>
      <button className="button button-dark" disabled={!matches || deleting} type="submit">{deleting ? "Deleting…" : "Delete permanently"}</button>
      {error ? <div className="form-message error" role="alert">{error}</div> : null}
    </form>
  </section>;
}
