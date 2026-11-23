"use client";

import { useCallback, useEffect, useState } from "react";
import { SlipOutGame } from "@/components/slipout-game";
import { SlipOutLevels } from "@/components/slipout-levels";

export type SlipOutMode = "daily" | "levels" | "how-to-play";

const paths: Record<SlipOutMode, string> = {
  daily: "/daily/slipout",
  levels: "/daily/slipout/levels",
  "how-to-play": "/daily/slipout/how-to-play"
};

function modeFromPath(path: string): SlipOutMode {
  if (path === paths.levels) return "levels";
  if (path === paths["how-to-play"]) return "how-to-play";
  return "daily";
}

export function SlipOutExperience({ signedIn, userId, initialMode = "daily" }: { signedIn: boolean; userId?: string | null; initialMode?: SlipOutMode }) {
  const [mode, setMode] = useState<SlipOutMode>(initialMode);
  const [visited, setVisited] = useState<SlipOutMode[]>([initialMode]);
  const [practiceAttempt, setPracticeAttempt] = useState<"levels" | "how-to-play" | null>(null);
  const attemptChanged = useCallback((source: "levels" | "how-to-play", playing: boolean) => {
    setPracticeAttempt(current => playing ? source : current === source ? null : current);
  }, []);

  useEffect(() => {
    const followHistory = () => {
      const next = modeFromPath(window.location.pathname);
      if (practiceAttempt && next !== "daily" && next !== practiceAttempt) {
        window.history.replaceState(null, "", paths[mode]);
        return;
      }
      setMode(next);
      setVisited(previous => previous.includes(next) ? previous : [...previous, next]);
    };
    window.addEventListener("popstate", followHistory);
    return () => window.removeEventListener("popstate", followHistory);
  }, [practiceAttempt, mode]);

  function select(next: SlipOutMode) {
    if (next === mode) return;
    if (practiceAttempt && next !== "daily" && next !== practiceAttempt) return;
    window.history.pushState(null, "", paths[next]);
    setMode(next);
    setVisited(previous => previous.includes(next) ? previous : [...previous, next]);
  }

  return <section className="so-page so-experience shell">
    <header className="so-game-header">
      <div><h1>SlipOut</h1><p>Slide. Switch. Escape.</p></div>
      <span className="so-mode-badge">{mode === "daily" ? "Daily Puzzle" : "Practice"}</span>
    </header>
    <nav className="so-mode-nav" aria-label="SlipOut game modes">
      {(["daily", "levels", "how-to-play"] as const).map(item => <button key={item} type="button"
        className={mode === item ? "active" : ""} aria-current={mode === item ? "page" : undefined}
        disabled={Boolean(practiceAttempt && item !== "daily" && item !== practiceAttempt)}
        title={practiceAttempt && item !== "daily" && item !== practiceAttempt ? "Finish or restart the current practice puzzle first" : undefined}
        onClick={() => select(item)}>{item === "how-to-play" ? "How to Play" : item === "daily" ? "Daily" : "Levels"}</button>)}
    </nav>
    {visited.includes("daily") && <div hidden={mode !== "daily"} className="so-mode-pane"><SlipOutGame signedIn={signedIn} userId={userId} /></div>}
    {visited.includes("levels") && <div hidden={mode !== "levels"} className="so-mode-pane"><SlipOutLevels signedIn={signedIn} mode="levels" active={mode === "levels"} onAttemptStateChange={attemptChanged} /></div>}
    {visited.includes("how-to-play") && <div hidden={mode !== "how-to-play"} className="so-mode-pane"><SlipOutLevels signedIn={signedIn} mode="tutorial" active={mode === "how-to-play"} onAttemptStateChange={attemptChanged} /></div>}
  </section>;
}
