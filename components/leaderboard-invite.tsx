"use client";

import { useEffect, useState } from "react";

type LinkState = { active: boolean; url: string | null };

export function LeaderboardInvite({ boardId, locked = false }: { boardId: string; locked?: boolean }) {
  const [link, setLink] = useState<LinkState | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const endpoint = `/api/v1/leaderboards/${encodeURIComponent(boardId)}/invite`;

  useEffect(() => {
    let active = true;
    fetch(endpoint, { cache: "no-store" }).then(async response => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not load invitation.");
      if (active) setLink(body);
    }).catch(cause => { if (active) setMessage(cause instanceof Error ? cause.message : "Could not load invitation."); });
    return () => { active = false; };
  }, [endpoint]);

  async function change(method: "POST" | "DELETE", suffix = "") {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(endpoint + suffix, { method });
      const body = response.status === 204 ? null : await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error ?? "Could not change invitation.");
      setLink(body ?? { active: false, url: null });
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not change invitation."); }
    finally { setBusy(false); }
  }

  async function copy() {
    if (!link?.url) return;
    try { await navigator.clipboard.writeText(link.url); setMessage("Invite link copied."); }
    catch { setMessage("Could not copy. Select the link and copy it manually."); }
  }

  return <div className="form-stack"><h3>Invite players</h3><p className="subtle">Anyone with this link can create an account or sign in and join this leaderboard.</p>
    {link?.url ? <><input aria-label="Invite link" readOnly value={link.url} onFocus={event => event.currentTarget.select()} />
      <div className="heading-actions"><button className="button" type="button" onClick={() => void copy()}>Copy invite link</button>
        {!locked ? <button className="button button-ghost" type="button" disabled={busy} onClick={() => void change("POST", "/regenerate")}>Regenerate link</button> : null}
        <button className="text-button" type="button" disabled={busy} onClick={() => void change("DELETE")}>Revoke link</button></div></>
      : link && !locked ? <button className="button" type="button" disabled={busy} onClick={() => void change("POST")}>Create invite link</button> : null}
    {message ? <p role="status">{message}</p> : null}
  </div>;
}
