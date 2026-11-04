"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppData } from "@/components/app-data-provider";
import { invalidateClientCachePrefix } from "@/lib/client-cache";

export function MemberManager({ leaderboardId, onChanged }: { leaderboardId: string; onChanged?: () => void }) {
  const { userId } = useAppData();
  const router = useRouter();
  const [shareId, setShareId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setMessage("");
    const response = await fetch(`/api/v1/leaderboards/${leaderboardId}/members`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shareId }) });
    const data = await response.json(); setLoading(false);
    if (!response.ok) { setMessage(data.error ?? "Could not add that account."); return; }
    setShareId(""); setMessage("Player added."); invalidateClientCachePrefix(userId, `/leaderboards/${encodeURIComponent(leaderboardId)}?`); if (onChanged) onChanged(); else router.refresh();
  }
  return <form className="form-stack" onSubmit={submit}><div className="field"><label htmlFor="share-id">Player account UUID</label><input id="share-id" value={shareId} onChange={(event) => setShareId(event.target.value)} placeholder="00000000-0000-0000-0000-000000000000" required /></div><button className="button" disabled={loading} type="submit">{loading ? "Adding…" : "Add to leaderboard"}<span>+</span></button>{message ? <div className={`form-message ${message === "Player added." ? "success" : "error"}`}>{message}</div> : null}</form>;
}

export function RemoveMemberButton({ leaderboardId, userId, onChanged }: { leaderboardId: string; userId: string; onChanged?: () => void }) {
  const { userId: viewerId } = useAppData();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return <button className="text-button" disabled={loading} type="button" onClick={async () => { if (!window.confirm("Remove this player from the leaderboard?")) return; setLoading(true); const response = await fetch(`/api/v1/leaderboards/${leaderboardId}/members/${userId}`, { method: "DELETE" }); if (response.ok) { invalidateClientCachePrefix(viewerId, `/leaderboards/${encodeURIComponent(leaderboardId)}?`); if (onChanged) onChanged(); else router.refresh(); } else setLoading(false); }}>{loading ? "Removing…" : "Remove"}</button>;
}
