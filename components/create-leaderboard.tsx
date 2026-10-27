"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateLeaderboard() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setMessage("");
    const response = await fetch("/api/leaderboards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error ?? "Could not create leaderboard."); setLoading(false); return; }
    router.push(`/leaderboards/${data.id}`); router.refresh();
  }
  return <form className="inline-form" onSubmit={submit}><div className="field"><label htmlFor="board-name">New leaderboard</label><input id="board-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Friday lunch crew" minLength={2} maxLength={48} required /></div><button className="button" disabled={loading} type="submit">{loading ? "Creating…" : "Create"}</button>{message ? <div className="form-message error">{message}</div> : null}</form>;
}
