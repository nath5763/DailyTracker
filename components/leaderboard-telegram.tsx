"use client";

import { useState } from "react";
import { AppLink } from "@/components/app-link";
import { CopyButton } from "@/components/copy-button";
import { TelegramSymbol } from "@/components/telegram-symbol";
import { useAppData } from "@/components/app-data-provider";
import { invalidateClientCache, useCachedApi } from "@/lib/client-cache";
import type { BillingStatus } from "@/lib/types";

type Group = { chatId: number; title: string };
type Status = { configured: boolean; linked: boolean; botUrl: string; botUsername: string };

export function LeaderboardTelegram({ boardId, owner }: { boardId: string; owner: boolean }) {
  const { userId } = useAppData();
  const groups = useCachedApi<Group[]>(`/telegram/leaderboards/${boardId}/groups`);
  const status = useCachedApi<Status>("/telegram/status");
  const billing = useCachedApi<BillingStatus>("/billing/status", { enabled: owner });
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState<number | null>(null);
  const setupCommand = `/setup ${boardId}`;

  async function disconnect(group: Group) {
    if (!window.confirm(`Disconnect ${group.title} from this leaderboard?`)) return;
    setWorking(group.chatId); setMessage("");
    try {
      const response = await fetch(`/api/v1/telegram/leaderboards/${boardId}/groups/${group.chatId}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Could not disconnect the group.");
      }
      invalidateClientCache(userId, [`/telegram/leaderboards/${boardId}/groups`]);
      await groups.refresh();
      setMessage("Group disconnected.");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not disconnect the group."); }
    finally { setWorking(null); }
  }

  return <section className="card" id="leaderboard-telegram">
    <h2 className="telegram-label"><TelegramSymbol />Telegram groups</h2>
    {groups.data?.length ? <div className="list">{groups.data.map(group => <div className="list-row" key={group.chatId}>
      <span>{group.title}<small>Group ID {group.chatId}</small></span>
      {owner ? <button className="text-button" disabled={working !== null} type="button" onClick={() => void disconnect(group)}>Disconnect</button> : null}
    </div>)}</div> : <p className="subtle">No Telegram group is connected to this leaderboard.</p>}
    <button className="text-button" type="button" onClick={() => void groups.refresh()}>Refresh groups</button>
    {owner && status.data?.configured && billing.data?.tier !== "FREE" ? <>
      <p>To connect this leaderboard, add the bot to a Telegram group you administer. Then send the setup command below in that group from your linked Telegram account. The bot will confirm the connection in the group.</p>
      <div className="uuid-box">{setupCommand}</div><CopyButton value={setupCommand} label="Copy Telegram setup command" />
      <a className="button button-ghost telegram-label" href={`https://t.me/${status.data.botUsername}?startgroup=setup`} target="_blank" rel="noopener noreferrer"><TelegramSymbol />Add bot to a group ↗</a>
      <p className="subtle">Only the current board owner can replace an existing group mapping.</p>
    </> : owner && billing.data?.tier === "FREE" ? <p>A paid plan is required to connect a Telegram group.</p> : null}
    <AppLink className="secondary-link telegram-label" href="/telegram"><TelegramSymbol />Read the Telegram setup guide</AppLink>
    {message ? <p role="status" className="form-message">{message}</p> : null}
  </section>;
}
