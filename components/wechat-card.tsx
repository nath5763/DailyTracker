"use client";

import { useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { useCachedApi } from "@/lib/client-cache";

type Status = { enabled: boolean; linked: boolean; provisional: boolean };
type Code = { code: string; expiresAt: string };

export function WeChatCard() {
  const status = useCachedApi<Status>("/wechat/status");
  const [code, setCode] = useState<Code | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (!status.data?.enabled) return null;

  async function generate() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/v1/wechat/link-codes", { method: "POST" });
      const body = await response.json() as Code & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not create a link code.");
      setCode(body);
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not create a link code."); }
    finally { setBusy(false); }
  }

  async function unlink() {
    if (!window.confirm("Disconnect your WeChat identity? Your saved scores will remain.")) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/v1/wechat/identity", { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Could not disconnect WeChat.");
      }
      await status.refresh(); setCode(null); setMessage("WeChat disconnected.");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not disconnect WeChat."); }
    finally { setBusy(false); }
  }

  return <section className="card discord-card" aria-busy={busy}>
    <p className="field-label">WeChat Mini Program</p>
    {status.data?.linked ? <>
      <h2>Connected</h2><p>Open Daily Tracker in WeChat to join your friends&apos; leaderboard and submit scores.</p>
      <button className="button button-ghost" type="button" disabled={busy} onClick={() => void unlink()}>Disconnect WeChat</button>
    </> : <>
      <h2>Connect your existing account</h2>
      <p>Open the Daily Tracker Mini Program, sign in with WeChat, then enter this one-time code there. Generate the code before creating a separate Mini Program profile. It expires after 10 minutes.</p>
      {code && Date.parse(code.expiresAt) > Date.now() ? <div className="discord-code"><div className="uuid-box">{code.code}</div><CopyButton value={code.code} label="Copy WeChat link code" /></div> : null}
      <button className="button button-ghost" type="button" disabled={busy} onClick={() => void generate()}>Generate link code</button>
    </>}
    {message ? <p className="form-message" role="status">{message}</p> : null}
  </section>;
}
