"use client";

import { useEffect, useState } from "react";
import { SubscriptionChoices } from "@/components/billing-actions";
import { useCachedApi } from "@/lib/client-cache";
import type { BillingStatus, DiscordChannel } from "@/lib/types";

type ErrorBody = { error?: string; code?: string };

export function LeaderboardDiscord({ boardId, owner, setupToken, discordStatus }: {
  boardId: string; owner: boolean; setupToken?: string; discordStatus?: string;
}) {
  const billing = useCachedApi<BillingStatus>("/billing/status", { enabled: owner });
  const setupStatus = useCachedApi<{ configured: boolean }>("/discord/setup-status", { enabled: owner });
  const connected = useCachedApi<DiscordChannel[]>(`/discord/leaderboards/${boardId}/channels`);
  const [available, setAvailable] = useState<DiscordChannel[]>([]);
  const [channelLoading, setChannelLoading] = useState(Boolean(setupToken));
  const [chosen, setChosen] = useState("");
  const [saved, setSaved] = useState<DiscordChannel | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [replace, setReplace] = useState(false);

  useEffect(() => {
    if (!owner || !setupToken) return;
    let active = true;
    fetch(`/api/v1/discord/leaderboards/${boardId}/setup/channels?setupToken=${encodeURIComponent(setupToken)}`,
      { cache: "no-store" })
      .then(async response => {
        const body = await response.json() as DiscordChannel[] & ErrorBody;
        if (!response.ok) throw new Error(body.error ?? "Could not load Discord channels.");
        return body;
      })
      .then(channels => { if (active) setAvailable(channels); })
      .catch(error => { if (active) setMessage(error instanceof Error ? error.message : "Could not load Discord channels."); })
      .finally(() => { if (active) setChannelLoading(false); });
    return () => { active = false; };
  }, [boardId, owner, setupToken]);

  async function start() {
    setLoading(true); setMessage("");
    try {
      const response = await fetch(`/api/v1/discord/leaderboards/${boardId}/authorization`, { method: "POST" });
      const body = await response.json() as { url?: string } & ErrorBody;
      if (!response.ok || !body.url) throw new Error(body.error ?? "Could not start Discord setup.");
      window.location.assign(body.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start Discord setup.");
      setLoading(false);
    }
  }

  async function save(confirmed: boolean) {
    if (!setupToken || !chosen) return;
    setLoading(true); setMessage("");
    try {
      const response = await fetch(`/api/v1/discord/leaderboards/${boardId}/setup/channel`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupToken, channelId: chosen, replace: confirmed }),
      });
      const body = await response.json() as DiscordChannel & ErrorBody;
      if (response.status === 409 && body.code === "CHANNEL_REPLACEMENT_REQUIRED") {
        setReplace(true); return;
      }
      if (!response.ok) throw new Error(body.error ?? "Could not connect this channel.");
      setSaved(body); setReplace(false); setAvailable([]);
      void connected.refresh();
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("discord"); cleanUrl.searchParams.delete("setup");
      window.history.replaceState(null, "", cleanUrl.pathname + cleanUrl.search);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not connect this channel.");
    } finally { setLoading(false); }
  }

  const selected = available.find(channel => channel.channelId === chosen);
  return <section className="card" id="leaderboard-discord">
    <h2>Discord channels</h2>
    {connected.data?.length ? <div className="list">{connected.data.map(channel => <div className="list-row" key={`${channel.guildId}:${channel.channelId}`}><span>Connected channel <small>{channel.name ? `#${channel.name}` : channel.channelId}</small></span><a className="secondary-link" href={channel.url} target="_blank" rel="noopener noreferrer">Open channel in Discord</a></div>)}</div> : <p className="subtle">No channels are connected yet.</p>}
    {owner && billing.data?.tier === "FREE" ? <><p>A paid plan is required to add this leaderboard to Discord.</p><SubscriptionChoices /></> : null}
    {owner && billing.data?.tier !== "FREE" && billing.data && (setupStatus.data?.configured || setupToken) ? <>
      {setupStatus.data?.configured ? <button className="button" type="button" disabled={loading} onClick={() => void start()}>Add leaderboard to Discord</button> : null}
      {discordStatus === "cancelled" ? <p className="subtle">Discord authorization was cancelled.</p> : null}
      {discordStatus === "expired" ? <p className="form-message error">Discord setup expired. Start again.</p> : null}
      {discordStatus === "account" ? <p className="form-message error">This Discord account is already linked to another profile, or your profile is linked to a different Discord account.</p> : null}
      {discordStatus === "permissions" ? <p className="form-message error">Your Discord account needs Manage Server permission to connect a channel.</p> : null}
      {discordStatus === "bot" ? <p className="form-message error">The bot is unavailable in that server. Start again and authorize the bot installation.</p> : null}
      {discordStatus === "failed" ? <p className="form-message error">Discord setup could not be completed. Try again.</p> : null}
      {setupToken && channelLoading ? <p>Loading available channels...</p> : null}
      {setupToken && !channelLoading && !available.length && !message && !saved ? <p>No existing text channels are visible to the bot in this server.</p> : null}
      {setupToken && available.length ? <div className="form-stack">
        <label htmlFor="discord-channel">Choose an existing text channel</label>
        <select id="discord-channel" value={chosen} onChange={event => { setChosen(event.target.value); setReplace(false); }}>
          <option value="">Choose a channel</option>
          {available.map(channel => <option key={channel.channelId} value={channel.channelId}>#{channel.name}{channel.leaderboardId ? " (connected)" : ""}</option>)}
        </select>
        {selected?.leaderboardId && selected.leaderboardId !== boardId ? <p>This channel is connected to another leaderboard.</p> : null}
        {replace ? <div><p>Replace the leaderboard connected to this channel?</p><button className="button" disabled={loading} onClick={() => void save(true)} type="button">Confirm replacement</button></div>
          : <button className="button" disabled={loading || !chosen} onClick={() => void save(false)} type="button">Connect channel</button>}
      </div> : null}
      {saved ? <p className="form-message success">Channel connected. <a href={saved.url} target="_blank" rel="noopener noreferrer">Open channel in Discord</a></p> : null}
    </> : null}
    {message ? <p className="form-message error" role="alert">{message}</p> : null}
  </section>;
}
