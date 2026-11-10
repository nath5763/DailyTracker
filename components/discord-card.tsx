"use client";

import { useEffect, useState } from "react";
import { AppLink } from "@/components/app-link";
import { CopyButton } from "@/components/copy-button";
import type { BillingStatus, DiscordLinkCode, DiscordStatus } from "@/lib/types";
import { invalidateClientCache, invalidateClientCachePrefix, useCachedApi } from "@/lib/client-cache";
import { useAppData } from "@/components/app-data-provider";

type ErrorBody = { error?: string; code?: string };

export function DiscordCard() {
  const { userId } = useAppData();
  const userInstallUrl = process.env.NEXT_PUBLIC_DISCORD_USER_INSTALL_URL?.trim();
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
    if (!window.confirm("Unlink your Discord account? Channels connected to leaderboards you own will also be disconnected.")) return;
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
      invalidateClientCachePrefix(userId, "/discord/leaderboards/");
      void statusResult.refresh();
      setCode(null);
      setMessage("Discord has been unlinked. Channels connected to leaderboards you own were disconnected.");
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
      <p>Your Discord identity is linked. You can submit to a multi-game leaderboard with <code>/daily</code> in a configured server channel, DM, or Group DM. Choose a game each time.</p>
      <button className="button button-ghost" disabled={working} onClick={unlink} type="button">
        {working ? "Unlinking…" : "Unlink Discord"}
      </button>
    </> : <>
      <h2>Submit from Discord</h2>
      <p>Create a one-time code, then run <code>/link code:&lt;code&gt;</code> from your Discord account.</p>
      {code ? <div className="discord-code" aria-live="polite">
        <div className="uuid-box">{code.code}</div>
        <CopyButton value={code.code} label="Copy link code" />
        <small>{expired ? "This code has expired. Generate a new one." : `Expires ${new Date(code.expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`}</small>
      </div> : null}
      <button className="button button-ghost" disabled={working || Boolean(code && !expired)} onClick={generateCode} type="button">
        {working ? "Generating…" : code && expired ? "Generate a new code" : "Generate link code"}
      </button>
    </>}
    {status?.configured && userInstallUrl ? <>
      <p className="subtle">Install Daily Tracker to your Discord account to use its commands in DMs and Group DMs. No paid plan is required.</p>
      <a className="button button-ghost" href={userInstallUrl} target="_blank" rel="noopener noreferrer">
        Add to my Discord apps <span aria-hidden="true">↗</span>
      </a>
    </> : null}
    {status?.configured && billingResult.data?.tier !== "FREE" && billingResult.data ? <p className="subtle">Open a multi-game leaderboard you own to add it to a Discord channel.</p>
      : status?.configured && billingResult.data?.tier === "FREE" ? <p className="subtle">A paid tier is required to add Daily Tracker to a server. You can still link your account and use commands in a paid owner&apos;s connected channel.</p> : null}
    <AppLink className="secondary-link discord-guide-link" href="/discord">Read the Discord setup guide</AppLink>
    {message ? <div className={`form-message ${message.includes("unlinked") ? "success" : "error"}`} role="status">{message}</div> : null}
  </section>;
}
