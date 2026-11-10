"use client";

import { clearAllClientCache } from "@/lib/client-cache";

export function SignOutButton() {
  return <button className="text-button" type="button" onClick={async () => { await fetch("/api/v1/auth/logout", { method: "POST", credentials: "same-origin" }); clearAllClientCache(); try { localStorage.removeItem("daily-club:theme-user"); } catch { /* Storage may be unavailable. */ } document.documentElement.dataset.theme = "light"; window.location.assign(new URL("/", window.location.origin).toString()); }}>Sign out</button>;
}
