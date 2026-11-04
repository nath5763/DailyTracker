"use client";

import { useState } from "react";
import { navigateInApp } from "@/components/app-link";
import { formatScore } from "@/lib/format";
import { useAppData } from "@/components/app-data-provider";
import { invalidateClientCache, invalidateLeaderboardCacheForGame } from "@/lib/client-cache";
import { detectShareGame } from "@/lib/detect-share-game";
import { previewScore } from "@/lib/preview-score";
import type { Game, ParsedSubmission } from "@/lib/types";

export function ScoreComposer({ games }: { games: Game[] }) {
  const { userId, shareId } = useAppData();
  const [manualGameSlug, setManualGameSlug] = useState("");
  const [rawText, setRawText] = useState("");
  const [preview, setPreview] = useState<ParsedSubmission | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");
  const detectedGameSlug = detectShareGame(rawText, games.map((candidate) => candidate.slug));
  const game = games.find((candidate) => candidate.slug === (detectedGameSlug ?? manualGameSlug));
  const editable = new Set(game?.submission.editableFields ?? []);

  function parse() {
    if (!game) {
      setStatus("error");
      setMessage("Choose the game for this result before previewing it.");
      return;
    }
    setMessage("");
    try {
      setPreview(previewScore(game.slug, rawText));
      setStatus("idle");
    } catch (cause) {
      setPreview(null);
      setStatus("error");
      setMessage(cause instanceof Error ? cause.message : "We could not read that result.");
    }
  }

  function update<K extends keyof ParsedSubmission>(key: K, value: ParsedSubmission[K]) {
    setPreview((current) => current ? { ...current, [key]: value } : current);
  }

  async function save() {
    if (!preview || !game) return;
    setStatus("saving");
    const response = await fetch("/api/v1/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: game.slug, rawText, confirmed: preview }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus("error");
      setMessage(data.error ?? "Could not save this score.");
      return;
    }
    invalidateClientCache(userId, ["/dashboard"]);
    invalidateClientCache(userId, [`/profiles/${encodeURIComponent(shareId)}`]);
    invalidateLeaderboardCacheForGame(userId, game.slug);
    navigateInApp("/dashboard?added=1");
  }

  if (!games.length) return <div className="empty">No games are currently available for score submission.</div>;

  return (
    <div className="grid score-layout">
      <section className="card">
        <form className="form-stack" onSubmit={(event) => { event.preventDefault(); parse(); }}>
          <div className="field">
            <label htmlFor="result">Shared result text</label>
            <textarea id="result" placeholder="Paste a complete game share result" value={rawText} onChange={(event) => {
              setRawText(event.target.value);
              setManualGameSlug("");
              setPreview(null);
              setMessage("");
              setStatus("idle");
            }} required />
          </div>
          {detectedGameSlug && game ? <p className="subtle">Detected game: <strong>{game.name}</strong></p> : null}
          {rawText.trim() && !detectedGameSlug ? <div className="field">
            <label htmlFor="game">Choose game</label>
            <select id="game" value={manualGameSlug} onChange={(event) => {
              setManualGameSlug(event.target.value);
              setPreview(null);
              setMessage("");
              setStatus("idle");
            }}>
              <option value="">Select a game</option>
              {games.map((option) => <option key={option.id} value={option.slug}>{option.name}</option>)}
            </select>
          </div> : null}
          {message ? <div className="form-message error" role="alert">{message}</div> : null}
          <button className="button" disabled={!rawText.trim()} type="submit">
            Preview score<span>→</span>
          </button>
        </form>
      </section>

      <aside className="card preview-card">
        {preview && game ? <>
          <span className="result-chip">Ready to confirm</span>
          <div className="score-big">{(typeof preview.metrics.displayScore === "string" ? preview.metrics.displayScore : formatScore(preview.primaryScore, game.scoreFormat))}</div>
          <p className="subtle">{game.name} · {game.submission.puzzleLabel} {preview.puzzleKey}</p>
          <div className="form-stack">
            <div className="field"><label htmlFor="puzzle">{game.submission.puzzleLabel}</label><input id="puzzle" type="text" value={preview.puzzleKey} readOnly={!editable.has("puzzleKey")} onChange={(event) => update("puzzleKey", event.target.value)} /></div>
            <div className="field"><label htmlFor="score">{game.submission.scoreLabel}</label><input id="score" type="number" min={game.submission.scoreMin} max={game.submission.scoreMax ?? undefined} step={game.submission.scoreStep} value={preview.primaryScore} readOnly={!editable.has("primaryScore")} onChange={(event) => update("primaryScore", Number(event.target.value))} /></div>
            <div className="field"><label htmlFor="date">Puzzle date</label><input id="date" type="date" value={preview.playedOn} readOnly={!editable.has("playedOn")} onChange={(event) => update("playedOn", event.target.value)} /></div>
            <p className="privacy-note">Once confirmed, this result cannot be changed or removed individually.</p>
            <button className="button" type="button" disabled={status === "saving"} onClick={() => void save()}>{status === "saving" ? "Saving…" : "Confirm permanent score"}<span>✓</span></button>
          </div>
        </> : <div className="empty"><strong>Your parsed result will appear here.</strong><br /><br />Paste a complete game result to preview its score.</div>}
      </aside>
    </div>
  );
}
