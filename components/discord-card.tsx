"use client";

import { useEffect, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import type { BillingStatus, DiscordLinkCode, DiscordStatus } from "@/lib/types";
import { invalidateClientCache, useCachedApi } from "@/lib/client-cache";
import { useAppData } from "@/components/app-data-provider";

type ErrorBody = { error?: string; code?: string };

export function DiscordCard() {
  const { userId } = useAppData();
  const statusResult = useCachedApi<DiscordStatus>("/discord/status");
  const billingResult = useCachedApi<BillingStatus>("/billing/status");
  const status = statusResult.data;
  const [code, setCode] = useState<DiscordLinkCode | null>(null);
  const loading = statusResult.loading;
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [clockTick, setClockTick] = useState(() => Date.now());
  const expired = Boolean(code && (!Number.isFinite(Date.parse(code.expiresAt)) || clockTick >= Date.parse(code.expiresAt)));

  useEffect(() => {
    if (!code) return;
    const timer = window.setInterval(() => setClockTick(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [code]);

  async function generateCode() {
    setWorking(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/discord/link-codes", {
        method: "POST",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const body = await response.json().catch(() => ({})) as DiscordLinkCode & ErrorBody;
      if (!response.ok || !body.code || !body.expiresAt) {
        setMessage(body.error ?? "A link code could not be created. Try again shortly.");
        return;
      }
      setCode({ code: body.code, expiresAt: body.expiresAt });
    } catch {
      setMessage("A link code could not be created. Check your connection and try again.");
    } finally {
      setWorking(false);
    }
  }

  async function unlink() {
    if (!window.confirm("Unlink your Discord account from Daily Tracker?")) return;
    setWorking(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/discord/link", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as ErrorBody;
        setMessage(body.error ?? "Discord could not be unlinked. Try again shortly.");
        return;
      }
      invalidateClientCache(userId, ["/discord/status"]);
      void statusResult.refresh();
      setCode(null);
      setMessage("Discord has been unlinked.");
    } catch {
      setMessage("Discord could not be unlinked. Check your connection and try again.");
    } finally {
      setWorking(false);
    }
  }

  return <section className="card discord-card" id="discord-linking" aria-busy={loading || working}>
    <p className="field-label">Discord</p>
    {loading ? <p>Checking Discord linking…</p> : !status?.configured ? <>
      <h2>Not configured</h2>
      <p>Discord linking is not available yet. Your dashboard and scores still work normally.</p>
    </> : status.linked ? <>
      <h2>Connected</h2>
      <p>Your Discord identity is linked. You can submit with <code>/daily</code> in a configured server channel.</p>
      <button className="button button-ghost" disabled={working} onClick={unlink} type="button">
        {working ? "Unlinking…" : "Unlink Discord"}
      </button>
    </> : <>
      <h2>Submit from Discord</h2>
      <p>Create a one-time code, then run <code>/link code:&lt;code&gt;</code> in a server where Daily Tracker is installed.</p>
      {code ? <div className="discord-code" aria-live="polite">
        <div className="uuid-box">{code.code}</div>
        <CopyButton value={code.code} label="Copy link code" />
        <small>{expired ? "This code has expired. Generate a new one." : `Expires ${new Date(code.expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`}</small>
      </div> : null}
      <button className="button button-ghost" disabled={working || Boolean(code && !expired)} onClick={generateCode} type="button">
        {working ? "Generating…" : code && expired ? "Generate a new code" : "Generate link code"}
      </button>
    </>}
    {status?.configured && status.installUrl && billingResult.data?.tier !== "FREE" && billingResult.data ? <a className="button" href={status.installUrl} rel="noopener noreferrer" target="_blank">
      Add to Discord
    </a> : status?.configured && billingResult.data?.tier === "FREE" ? <p className="subtle">A paid tier is required to add Daily Tracker to a server. You can still link your account and use commands in a paid owner&apos;s connected channel.</p> : null}
    {message ? <div className={`form-message ${message.includes("unlinked") ? "success" : "error"}`} role="status">{message}</div> : null}
  </section>;
}
