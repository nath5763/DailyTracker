"use client";

import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";

export function AuthForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("sending");
    const supabase = createBrowserSupabase();
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/auth/callback?next=/dashboard` },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
      setMessage("Check your inbox. Your sign-in link is on its way.");
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
