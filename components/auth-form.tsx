"use client";

import { useState } from "react";

export function AuthForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("sending");
    const response = await fetch("/api/v1/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus("error");
      setMessage(data.error ?? "Could not send a sign-in link.");
    } else {
      setStatus("sent");
      setMessage(data.message ?? "Check your inbox. Your sign-in link is on its way.");
    }
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      <div className="field">
        <label htmlFor="email">Email address</label>
        <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required autoComplete="email" />
      </div>
      <button className="button" disabled={status === "sending" || status === "sent"} type="submit">
        {status === "sending" ? "Sending…" : status === "sent" ? "Link sent" : "Email me a sign-in link"}<span>→</span>
      </button>
      {message ? <div className={`form-message ${status === "error" ? "error" : "success"}`} role="status">{message}</div> : null}
    </form>
  );
}
