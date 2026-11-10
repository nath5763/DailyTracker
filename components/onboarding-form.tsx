"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OnboardingForm({ next = "/dashboard" }: { next?: string }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [avatarColor, setAvatarColor] = useState("#dfff4f");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    const response = await fetch("/api/v1/me/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName, avatarColor }) });
    if (!response.ok) { const data = await response.json().catch(() => ({})); setError(data.error ?? "Could not create your profile."); setLoading(false); return; }
    router.push(next); router.refresh();
  }
  return <form className="form-stack" onSubmit={submit}>
    <div className="field"><label htmlFor="displayName">Display name</label><input id="displayName" value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={32} required autoFocus /></div>
    <div className="field"><label htmlFor="avatarColor">Player color</label><select id="avatarColor" value={avatarColor} onChange={(event) => setAvatarColor(event.target.value)}><option value="#dfff4f">Club lime</option><option value="#ff8db6">Club pink</option><option value="#a8c7ff">Sky blue</option><option value="#ffba6b">Tangerine</option><option value="#bba7ff">Soft violet</option></select></div>
    {error ? <div className="form-message error">{error}</div> : null}
    <button className="button" disabled={loading} type="submit">{loading ? "Creating…" : "Enter the club"} <span>→</span></button>
  </form>;
}
