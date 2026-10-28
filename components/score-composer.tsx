"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ParsedSubmission } from "@/lib/types";

const example = `Fermi #92\n1.31× score\ntop 8%`;

export function ScoreComposer() {
  const router = useRouter();
  const [rawText, setRawText] = useState("");
  const [preview, setPreview] = useState<ParsedSubmission | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");

  async function parse() {
    setStatus("loading");
    setMessage("");
    const response = await fetch("/api/v1/submissions/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ game: "fermi", rawText }) });
    const data = await response.json();
    if (!response.ok) { setPreview(null); setStatus("error"); setMessage(data.error ?? "We could not read that result."); return; }
    setPreview(data.submission);
    setStatus("idle");
  }

  function update<K extends keyof ParsedSubmission>(key: K, value: ParsedSubmission[K]) {
    setPreview((current) => current ? { ...current, [key]: value } : current);
  }

  async function save() {
    if (!preview) return;
    setStatus("saving");
    const response = await fetch("/api/v1/submissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ game: "fermi", rawText, confirmed: preview }) });
    const data = await response.json();
    if (!response.ok) { setStatus("error"); setMessage(data.error ?? "Could not save this score."); return; }
    router.push("/dashboard?added=1");
    router.refresh();
  }

  return (
    <div className="grid score-layout">
      <section className="card">
        <form className="form-stack" onSubmit={(event) => { event.preventDefault(); void parse(); }}>
          <div className="field"><label htmlFor="game">Game</label><select id="game" value="fermi" disabled><option value="fermi">Fermi.gg</option></select></div>
          <div className="field"><label htmlFor="result">Shared result text</label><textarea id="result" placeholder={example} value={rawText} onChange={(event) => { setRawText(event.target.value); setPreview(null); }} required /></div>
          {message ? <div className="form-message error" role="alert">{message}</div> : null}
          <button className="button" disabled={status === "loading" || !rawText.trim()} type="submit">{status === "loading" ? "Reading result…" : "Preview score"}<span>→</span></button>
        </form>
      </section>

      <aside className="card preview-card">
        {preview ? <>
          <span className="result-chip">Ready to confirm</span>
          <div className="score-big">{preview.primaryScore.toFixed(2)}×</div>
          <p className="subtle">Fermi puzzle #{preview.puzzleNumber}</p>
          <div className="form-stack">
            <div className="field"><label htmlFor="puzzle">Puzzle number</label><input id="puzzle" type="number" min="1" value={preview.puzzleNumber} onChange={(event) => { const puzzleNumber = Number(event.target.value); setPreview({ ...preview, puzzleNumber, puzzleKey: String(puzzleNumber) }); }} /></div>
            <div className="field"><label htmlFor="score">Final score</label><input id="score" type="number" min="1" step="0.01" value={preview.primaryScore} onChange={(event) => update("primaryScore", Number(event.target.value))} /></div>
            <div className="field"><label htmlFor="date">Puzzle date</label><input id="date" type="date" value={preview.playedOn} onChange={(event) => update("playedOn", event.target.value)} /></div>
            <p className="privacy-note">Once confirmed, this result cannot be changed or removed individually.</p>
            <button className="button" type="button" disabled={status === "saving"} onClick={() => void save()}>{status === "saving" ? "Saving…" : "Confirm permanent score"}<span>✓</span></button>
          </div>
        </> : <div className="empty"><strong>Your parsed result will appear here.</strong><br /><br />We need the Fermi puzzle number and final score.</div>}
      </aside>
    </div>
  );
}
