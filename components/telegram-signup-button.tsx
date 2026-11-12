"use client";

import { useState } from "react";

export function TelegramSignupButton({ intent }: { intent: string }) {
  const [state, setState] = useState<"idle" | "requesting" | "waiting" | "completing" | "done">("idle");
  const [message, setMessage] = useState("");

  async function request() {
    setState("requesting"); setMessage("");
    try {
      const response = await fetch(`/api/v1/telegram/signup-intents/${intent}/confirmation`, { method: "POST" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Could not send the confirmation.");
      }
      setState("waiting");
      setMessage("Check your private Telegram chat with the bot and tap Confirm identity. Then return here.");
    } catch (cause) { setState("idle"); setMessage(cause instanceof Error ? cause.message : "Could not send the confirmation."); }
  }

  async function complete() {
    setState("completing"); setMessage("");
    try {
      const response = await fetch(`/api/v1/telegram/signup-intents/${intent}/complete`, { method: "POST" });
      const body = await response.json().catch(() => ({})) as { status?: string; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not finish Telegram signup.");
      setState("done");
      setMessage(({
        joined: "Your Telegram account is linked and you joined the group's leaderboard.",
        linked: "Your Telegram account is linked.",
        mapping: "Your account is linked, but the group's leaderboard changed. Ask its owner to add you.",
        locked: "Your account is linked, but the leaderboard is locked until its owner restores access.",
        "join-failed": "Your account is linked, but joining the leaderboard failed. Ask its owner to add you.",
      } as Record<string, string>)[body.status ?? ""] ?? "Your Telegram account is linked.");
    } catch (cause) {
      setState("waiting");
      setMessage(cause instanceof Error ? cause.message : "Could not finish Telegram signup.");
    }
  }

  return <div className="form-stack">
    {state === "idle" ? <button className="button" type="button" onClick={() => void request()}>Send Telegram confirmation</button> : null}
    {state === "requesting" || state === "completing" ? <p>Working…</p> : null}
    {state === "waiting" ? <><button className="button" type="button" onClick={() => void complete()}>I confirmed in Telegram</button><button className="text-button" type="button" onClick={() => void request()}>Send a new confirmation</button></> : null}
    {message ? <p role="status" className={state === "done" ? "form-message success" : "form-message"}>{message}</p> : null}
  </div>;
}
