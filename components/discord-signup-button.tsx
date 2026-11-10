"use client";

import { useState } from "react";
import { DiscordSymbol } from "@/components/discord-symbol";

export function DiscordSignupButton({ intent }: { intent: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function authorize() {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/v1/discord/signup-intents/${intent}/authorization`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) { setError(data.error ?? "Could not begin Discord verification."); return; }
      window.location.assign(data.url);
    } catch { setError("Could not begin Discord verification."); }
    finally { setLoading(false); }
  }
  return <><button className="button discord-label" type="button" disabled={loading} onClick={authorize}>
    <DiscordSymbol />{loading ? "Opening Discord…" : "Verify Discord identity"}</button>
    {error ? <p className="form-message error" role="alert">{error}</p> : null}</>;
}
