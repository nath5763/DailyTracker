"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatScore } from "@/lib/format";
import { useAppData } from "@/components/app-data-provider";
import { invalidateClientCache } from "@/lib/client-cache";
import { previewScore } from "@/lib/preview-score";
import type { Game, ParsedSubmission } from "@/lib/types";

export function ScoreComposer({ games }: { games: Game[] }) {
  const router = useRouter();
  const { userId } = useAppData();
  const [gameSlug, setGameSlug] = useState(games[0]?.slug ?? "");
  const [rawText, setRawText] = useState("");
  const [preview, setPreview] = useState<ParsedSubmission | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");
  const game = games.find((candidate) => candidate.slug === gameSlug) ?? games[0];
  const editable = new Set(game?.submission.editableFields ?? []);

  function parse() {
    if (!game) return;
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
    router.push("/dashboard?added=1");
  }

  if (!game) return <div className="empty">No games are currently available for score submission.</div>;

  return (
    <div className="grid score-layout">
      <section className="card">
        <form className="form-stack" onSubmit={(event) => { event.preventDefault(); parse(); }}>
          <div className="field">
            <label htmlFor="game">Game</label>
            <select id="game" value={game.slug} onChange={(event) => {
              setGameSlug(event.target.value);
              setRawText("");
              setPreview(null);
              setMessage("");
              setStatus("idle");
            }}>
              {games.map((option) => <option key={option.id} value={option.slug}>{option.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="result">Shared result text</label>
            <textarea id="result" placeholder={game.submission.exampleShareText} value={rawText} onChange={(event) => {
              setRawText(event.target.value);
              setPreview(null);
              setMessage("");
            }} required />
          </div>
          {message ? <div className="form-message error" role="alert">{message}</div> : null}
          <button className="button" disabled={!rawText.trim()} type="submit">
            Preview score<span>→</span>
          </button>
        </form>
      </section>

      <aside className="card preview-card">
        {preview ? <>
          <span className="result-chip">Ready to confirm</span>
          <div className="score-big">{formatScore(preview.primaryScore, game.scoreFormat)}</div>
          <p className="subtle">{game.name} · {game.submission.puzzleLabel} {preview.puzzleKey}</p>
          <div className="form-stack">
            <div className="field"><label htmlFor="puzzle">{game.submission.puzzleLabel}</label><input id="puzzle" type="text" value={preview.puzzleKey} readOnly={!editable.has("puzzleKey")} onChange={(event) => update("puzzleKey", event.target.value)} /></div>
            <div className="field"><label htmlFor="score">{game.submission.scoreLabel}</label><input id="score" type="number" min={game.submission.scoreMin} max={game.submission.scoreMax ?? undefined} step={game.submission.scoreStep} value={preview.primaryScore} readOnly={!editable.has("primaryScore")} onChange={(event) => update("primaryScore", Number(event.target.value))} /></div>
            <div className="field"><label htmlFor="date">Puzzle date</label><input id="date" type="date" value={preview.playedOn} readOnly={!editable.has("playedOn")} onChange={(event) => update("playedOn", event.target.value)} /></div>
            <p className="privacy-note">Once confirmed, this result cannot be changed or removed individually.</p>
            <button className="button" type="button" disabled={status === "saving"} onClick={() => void save()}>{status === "saving" ? "Saving…" : "Confirm permanent score"}<span>✓</span></button>
          </div>
        </> : <div className="empty"><strong>Your parsed result will appear here.</strong><br /><br />Paste a complete {game.name} result to preview its {game.submission.puzzleLabel.toLowerCase()} and score.</div>}
      </aside>
    </div>
  );
}
