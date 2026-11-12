"use client";

import { useEffect, useState } from "react";
import { AppLink } from "@/components/app-link";
import { CopyButton } from "@/components/copy-button";
import { TelegramSymbol } from "@/components/telegram-symbol";
import { useAppData } from "@/components/app-data-provider";
import { invalidateClientCache, useCachedApi } from "@/lib/client-cache";

type Status = { configured: boolean; linked: boolean; botUrl: string; botUsername: string };
type Code = { code: string; expiresAt: string };

export function TelegramCard() {
  const { userId } = useAppData();
  const result = useCachedApi<Status>("/telegram/status");
  const [code, setCode] = useState<Code | null>(null);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [clockTick, setClockTick] = useState(() => Date.now());
  const status = result.data;
  const activeCode = Boolean(code && clockTick < Date.parse(code.expiresAt));

  useEffect(() => {
    if (!code) return;
    const timer = window.setInterval(() => setClockTick(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [code]);

  async function generate() {
    setWorking(true); setMessage("");
    try {
      const response = await fetch("/api/v1/telegram/link-codes", { method: "POST" });
      const body = await response.json() as Code & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not create a code.");
      setCode(body); setClockTick(Date.now());
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not create a code."); }
    finally { setWorking(false); }
  }

  async function unlink() {
    if (!window.confirm("Unlink Telegram? Groups connected to boards you own will be disconnected.")) return;
    setWorking(true); setMessage("");
    try {
      const response = await fetch("/api/v1/telegram/link", { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Could not unlink Telegram.");
      }
      invalidateClientCache(userId, ["/telegram/status"]);
      setCode(null);
      await result.refresh();
      setMessage("Telegram unlinked.");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not unlink Telegram."); }
    finally { setWorking(false); }
  }

  return <section className="card discord-card" id="telegram-linking" aria-busy={working || result.loading}>
    <p className="field-label telegram-label"><TelegramSymbol />Telegram</p>
    {result.loading ? <p>Checking Telegram linking…</p> : !status?.configured ? <><h2>Not configured</h2><p>Telegram linking is not available yet.</p></> : status.linked ? <>
      <h2>Connected</h2><p>Your Telegram identity is linked. In a connected group, send <code>/daily</code> followed by the complete Share result in one message; the bot identifies the game and confirms the score there. Send <code>/daily</code> alone for the private flow, or <code>/leaderboard</code> to see rankings. Group owners connect a multi-game leaderboard from its page.</p>
      <button className="button button-ghost" type="button" disabled={working} onClick={() => void unlink()}>Unlink Telegram</button>
    </> : <>
      <h2>Submit from Telegram</h2>
      <ol className="telegram-link-steps"><li>Select <strong>Generate link code</strong> below. The code works once and expires after 10 minutes.</li><li>Select <strong>Open Telegram bot</strong> and start a private chat with the bot. Send <code>/link</code>.</li><li>When the bot asks for your code, paste it into that private chat. Wait for the bot to confirm your account is linked.</li><li>Return here and select <strong>Check link status</strong> to see Connected.</li></ol>
      {code ? <div className="discord-code"><div className="uuid-box">{code.code}</div><CopyButton value={code.code} label="Copy Telegram link code" /><small>Expires {new Date(code.expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.</small></div> : null}
      <button className="button button-ghost" type="button" disabled={working || activeCode} onClick={() => void generate()}>{code && !activeCode ? "Generate a new code" : "Generate link code"}</button>
      {status?.configured ? <a className="secondary-link telegram-label" href={status.botUrl} target="_blank" rel="noopener noreferrer"><TelegramSymbol />Open Telegram bot ↗</a> : null}
      <button className="text-button" type="button" onClick={() => void result.refresh()}>Check link status</button>
    </>}
    {status?.linked ? <a className="secondary-link telegram-label" href={status.botUrl} target="_blank" rel="noopener noreferrer"><TelegramSymbol />Open Telegram bot ↗</a> : null}
    <AppLink className="secondary-link discord-guide-link telegram-label" href="/telegram"><TelegramSymbol />Read the Telegram setup guide</AppLink>
    {message ? <p className="form-message" role="status">{message}</p> : null}
  </section>;
}
