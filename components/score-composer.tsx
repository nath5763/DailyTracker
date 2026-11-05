"use client";

import { useState } from "react";
import { navigateInApp } from "@/components/app-link";
import { formatScore } from "@/lib/format";
import { useAppData } from "@/components/app-data-provider";
import { invalidateClientCache, invalidateLeaderboardCacheForGame } from "@/lib/client-cache";
import { detectShareGame } from "@/lib/detect-share-game";
import type { Game, ManualEntryField, ParsedSubmission } from "@/lib/types";

export function ScoreComposer({ games }: { games: Game[] }) {
  const [mode, setMode] = useState<"paste" | "manual">("paste");
  const [manualGameSlug, setManualGameSlug] = useState("");
  return <>
    <div className="tabs entry-mode-tabs" role="tablist" aria-label="Score entry method">
      <button className={`tab ${mode === "paste" ? "active" : ""}`} type="button" onClick={() => setMode("paste")}>Paste result</button>
      <button className={`tab ${mode === "manual" ? "active" : ""}`} type="button" onClick={() => setMode("manual")}>Enter manually</button>
    </div>
    {mode === "paste" ? <PasteScoreComposer games={games} onManual={slug => { setManualGameSlug(slug); setMode("manual"); }} /> : <ManualScoreComposer games={games} initialSlug={manualGameSlug} />}
  </>;
}

function PasteScoreComposer({ games, onManual }: { games: Game[]; onManual: (slug: string) => void }) {
  const pasteGames = games.filter(game => game.supportedFormats?.includes("share-text") ?? true);
  const { userId, shareId } = useAppData();
  const [manualGameSlug, setManualGameSlug] = useState("");
  const [rawText, setRawText] = useState("");
  const [preview, setPreview] = useState<ParsedSubmission | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");
  const detectedGameSlug = detectShareGame(rawText, pasteGames.map((candidate) => candidate.slug));
  const game = pasteGames.find((candidate) => candidate.slug === (detectedGameSlug ?? manualGameSlug));
  const editable = new Set(game?.submission.editableFields ?? []);

  async function parse() {
    if (!game) {
      setStatus("error");
      setMessage("Choose the game for this result before previewing it.");
      return;
    }
    setMessage("");
    try {
      const response = await fetch("/api/v1/submissions/preview", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: game.slug, rawText }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "We could not read that result.");
      setPreview(data.submission as ParsedSubmission);
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
        <form className="form-stack" onSubmit={(event) => { event.preventDefault(); void parse(); }}>
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
              {pasteGames.map((option) => <option key={option.id} value={option.slug}>{option.name}</option>)}
            </select>
          </div> : null}
          {message ? <><div className="form-message error" role="alert">{message}</div><button className="text-button" type="button" onClick={() => onManual(game?.manualEntry.supported ? game.slug : "")}>Enter the score manually instead</button></> : null}
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

function ManualScoreComposer({ games, initialSlug }: { games: Game[]; initialSlug: string }) {
  const { userId, shareId } = useAppData();
  const available = games.filter(game => game.manualEntry?.supported);
  const initialGame = available.find(game => game.slug === initialSlug);
  const [slug, setSlug] = useState(initialGame?.slug ?? "");
  const [puzzleDate, setPuzzleDate] = useState("");
  const [puzzleId, setPuzzleId] = useState("");
  const [completionStatus, setCompletionStatus] = useState(initialGame?.manualEntry.completionStatuses[0] ?? "");
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [preview, setPreview] = useState<ParsedSubmission | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const game = available.find(candidate => candidate.slug === slug);

  function reset() { setPreview(null); setMessage(""); }
  function chooseGame(next: string) {
    const selected = available.find(candidate => candidate.slug === next);
    setSlug(next); setCompletionStatus(selected?.manualEntry.completionStatuses[0] ?? ""); setValues({}); reset();
  }
  function request() {
    if (!game) throw new Error("Choose a game first.");
    return { game: game.slug, puzzleId: puzzleId.trim() || null, puzzleDate, completionStatus, values };
  }
  async function parse() {
    try {
      const response = await fetch("/api/v1/submissions/manual/preview", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request()),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "We could not validate that score.");
      setPreview(data.submission as ParsedSubmission); setMessage("");
    } catch (cause) { setPreview(null); setMessage(cause instanceof Error ? cause.message : "We could not validate that score."); }
  }
  async function save() {
    if (!game || !preview) return;
    setSaving(true);
    const response = await fetch("/api/v1/submissions/manual", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request()),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setSaving(false); setMessage(data.error ?? "Could not save this score."); return; }
    invalidateClientCache(userId, ["/dashboard"]);
    invalidateClientCache(userId, [`/profiles/${encodeURIComponent(shareId)}`]);
    invalidateLeaderboardCacheForGame(userId, game.slug);
    navigateInApp("/dashboard?added=1");
  }

  if (!available.length) return <div className="empty">Manual entry is not currently available for any active game.</div>;
  return <div className="grid score-layout">
    <section className="card"><form className="form-stack" onSubmit={event => { event.preventDefault(); void parse(); }}>
      <p className="privacy-note">Manual scores are ranked normally and labeled as unverified.</p>
      <div className="field"><label htmlFor="manual-game">Choose game</label><select id="manual-game" value={slug} onChange={event => chooseGame(event.target.value)} required><option value="">Select a game</option>{available.map(option => <option key={option.id} value={option.slug}>{option.name}</option>)}</select></div>
      <div className="field"><label htmlFor="manual-date">Puzzle date</label><input id="manual-date" type="date" value={puzzleDate} onChange={event => { setPuzzleDate(event.target.value); reset(); }} required /></div>
      <div className="field"><label htmlFor="manual-puzzle">Puzzle ID <span className="subtle">(optional)</span></label><input id="manual-puzzle" type="text" maxLength={80} placeholder="For example, 1746" value={puzzleId} onChange={event => { setPuzzleId(event.target.value); reset(); }} /></div>
      {game && game.manualEntry.completionStatuses.length > 1 ? <div className="field"><label htmlFor="manual-status">Result</label><select id="manual-status" value={completionStatus} onChange={event => { setCompletionStatus(event.target.value); reset(); }}>{game.manualEntry.completionStatuses.map(status => <option key={status} value={status}>{status === "WIN" ? "Completed" : "Not solved"}</option>)}</select></div> : null}
      {game?.manualEntry.fields.map(field => <ManualField field={field} key={field.key} value={values[field.key]} onChange={value => { setValues(current => ({ ...current, [field.key]: value })); reset(); }} />)}
      {message ? <div className="form-message error" role="alert">{message}</div> : null}
      <button className="button" type="submit" disabled={!game || !puzzleDate}>Preview manual score<span>→</span></button>
    </form></section>
    <aside className="card preview-card">{preview && game ? <>
      <span className="result-chip">Manual · unverified</span>
      <div className="score-big">{typeof preview.metrics.displayScore === "string" ? preview.metrics.displayScore : formatScore(preview.primaryScore, game.scoreFormat)}</div>
      <p className="subtle">{game.name} · {game.submission.puzzleLabel} {preview.puzzleKey}</p>
      <div className="form-stack"><p className="privacy-note">This result was entered manually and cannot be independently verified.</p><p className="privacy-note">Once confirmed, this result cannot be changed or removed individually.</p><button className="button" type="button" disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Confirm permanent score"}<span>✓</span></button></div>
    </> : <div className="empty"><strong>Your score preview will appear here.</strong><br /><br />Choose a game and enter its result details.</div>}</aside>
  </div>;
}

function ManualField({ field, value, onChange }: { field: ManualEntryField; value: string | boolean | undefined; onChange: (value: string | boolean) => void }) {
  const id = `manual-${field.key}`;
  if (field.type === "BOOLEAN") return <div className="field checkbox-field"><label htmlFor={id}><input id={id} type="checkbox" checked={value === true} onChange={event => onChange(event.target.checked)} /> {field.label}</label>{field.helpText ? <small className="subtle">{field.helpText}</small> : null}</div>;
  return <div className="field"><label htmlFor={id}>{field.label}{!field.required ? <span className="subtle"> (optional)</span> : null}</label>{field.type === "ENUM" ? <select id={id} value={typeof value === "string" ? value : ""} onChange={event => onChange(event.target.value)} required={field.required}><option value="">Select</option>{field.options.map(option => <option key={option} value={option}>{option === "FAIL" ? "Failed" : option}</option>)}</select> : <input id={id} type={field.type === "DURATION" || field.type === "TEXT" ? "text" : "number"} inputMode={field.type === "DURATION" ? "numeric" : field.type === "TEXT" ? "text" : "decimal"} min={field.min ?? undefined} max={field.max ?? undefined} step={field.step ?? undefined} maxLength={field.type === "TEXT" ? 50 : undefined} placeholder={field.type === "DURATION" ? "m:ss" : undefined} value={typeof value === "string" ? value : ""} onChange={event => onChange(event.target.value)} required={field.required} />}{field.helpText ? <small className="subtle">{field.helpText}</small> : null}</div>;
}
