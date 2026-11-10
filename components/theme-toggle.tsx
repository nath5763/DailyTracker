"use client";

import { useState } from "react";
import { useAppData } from "@/components/app-data-provider";

export function ThemeToggle() {
  const { darkMode, setDarkMode } = useAppData();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    const next = !darkMode;
    setDarkMode(next);
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/v1/me/theme", {
        method: "PATCH", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ darkMode: next }),
      });
      if (!response.ok) throw new Error("Could not save your theme. Try again.");
    } catch {
      setDarkMode(!next);
      setError("Could not save your theme. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return <section className="card theme-setting">
    <div><h2>Appearance</h2><p className="subtle">Use darker backgrounds and lighter text across Daily Tracker.</p></div>
    <label className="theme-switch"><input type="checkbox" checked={darkMode} disabled={saving} onChange={() => void toggle()} /><span>Dark mode</span></label>
    {error && <p role="alert" className="form-message error">{error}</p>}
  </section>;
}
