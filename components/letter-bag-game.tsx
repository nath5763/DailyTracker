"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import type { Round, Tile, Word } from "@/lib/letter-bag/engine";

type View = { date: string; gameNumber: string; rack: Tile[]; preview: Tile[]; bagRemaining: number; words: Word[]; score: number; startedAt: number | null; endedAt: number | null; remaining: number; serverNow: number };
const day = () => new Date().toISOString().slice(0, 10);
function localView(round: Round): View { return { date: round.date, gameNumber: round.date.replaceAll("-", ""), rack: round.startedAt === null ? round.rack.map(t => ({ ...t, letter: "?" })) : round.rack, preview: round.bag.slice(0, 5).map(t => round.startedAt === null ? { ...t, letter: "?" } : t), bagRemaining: round.bag.length, words: round.words, score: round.score, startedAt: round.startedAt, endedAt: round.endedAt, remaining: round.startedAt === null ? 90 : Math.max(0, Math.ceil((round.startedAt + 90000 - Date.now()) / 1000)), serverNow: Date.now() }; }
async function request(path: string, method = "GET", ids?: number[]): Promise<View> {
  const response = await fetch(`/api/v1/letter-bag/today${path}`, { method, credentials: "same-origin", headers: ids ? { "Content-Type": "application/json" } : undefined, body: ids ? JSON.stringify({ ids }) : undefined, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Could not load Letter Bag.");
  return data;
}
export function LetterBagGame({ saved }: { saved: boolean }) {
  const [view, setView] = useState<View | null>(null);
  const [local, setLocal] = useState<Round | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [help, setHelp] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => { if (!help) return; const close = (event: KeyboardEvent) => { if (event.key === "Escape") setHelp(false); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [help]);
  useEffect(() => { let live = true; if (saved) request("").then(v => { if (live) setView(v); }).catch(e => { if (live) setMessage(e.message); }); else import("@/lib/letter-bag/engine").then(engine => { if (live) { const round = engine.createRound(day()); setLocal(round); setView(localView(round)); } }); return () => { live = false; }; }, [saved]);
  useEffect(() => { const timer = window.setInterval(() => setTick(Date.now()), 250); return () => window.clearInterval(timer); }, []);
  const remaining = view?.startedAt == null ? 90 : Math.max(0, Math.ceil((view.startedAt + 90000 - tick) / 1000));
  useEffect(() => { if (!view || !saved || view.startedAt === null || view.endedAt !== null || remaining > 0) return; request("").then(setView).catch(e => setMessage(e.message)); }, [view, saved, remaining]);
  const act = useCallback(async (action: "start" | "words" | "finish") => {
    if (!view || busy) return;
    setBusy(true); setMessage("");
    try {
      if (saved) setView(await request(`/${action}`, "POST", action === "words" ? selected : undefined));
      else if (local) {
        const engine = await import("@/lib/letter-bag/engine");
        let round: Round = local;
        if (action === "start") round = { ...(round.date === day() ? round : engine.createRound(day())), startedAt: Date.now() };
        if (action === "words") { const result = engine.submit(round, selected); round = result.round; if (result.error) setMessage(result.error); }
        if (action === "finish") round = engine.finish(round);
        setLocal(round); setView(localView(round));
      }
      setSelected([]);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Something went wrong."); if (saved) request("").then(setView).catch(() => {}); }
    finally { setBusy(false); }
  }, [view, busy, saved, selected, local]);
  if (!view) return <section className="shell letter-bag"><h1>Letter Bag</h1><p role="status">{message || "Loading today’s game…"}</p></section>;
  const started = view.startedAt !== null;
  const ended = view.endedAt !== null || started && remaining === 0;
  const active = started && !ended;
  const chosen = selected.map(id => view.rack.find(tile => tile.id === id)).filter((tile): tile is Tile => !!tile);
  const longest = Math.max(0, ...view.words.map(word => word.word.length));
  const share = `Letter Bag #${view.gameNumber}\nScore: ${view.score}\nWords: ${view.words.length}\nLongest word: ${longest} letters${saved ? "" : "\nUnsaved round"}\n${typeof window === "undefined" ? "" : `${window.location.origin}/daily/letter-bag`}`;
  return <section className="shell letter-bag">
    <div className="lb-top"><div><p className="section-number">DAILY GAME #{view.gameNumber}</p><h1>Letter Bag</h1><p>{saved ? "Your one scored attempt today" : "Guest round · unsaved"}</p></div><button type="button" className="secondary-link" onClick={() => setHelp(true)}>How to play</button></div>
    <div className="lb-stats"><div><span>SCORE</span><strong>{view.score}</strong></div><div><span>TIME</span><strong>{remaining}s</strong></div><div><span>BAG</span><strong>{view.bagRemaining}</strong></div></div>
    <div className="lb-timer" aria-hidden="true"><span style={{ width: `${remaining / 90 * 100}%` }} /></div>
    {ended ? <div className="lb-result"><p className="section-number">{saved ? "DAILY RESULT" : "UNSAVED RESULT"}</p><h2>{view.score} points</h2><p>{view.words.length} words · longest {longest} letters</p><button className="button" type="button" onClick={() => navigator.clipboard.writeText(share).then(() => setMessage("Result copied.")).catch(() => setMessage("Could not copy result."))}>Copy result</button>{view.words.length > 0 && <div className="lb-history"><h3>Words played</h3>{[...view.words].reverse().map((word, i) => <div key={i}>{word.word}<b>+{word.points}</b></div>)}</div>}</div> : <div className="lb-board">
      <div className="lb-bag"><Image src="/letter-bag/letter-bag.webp" width={500} height={300} alt="" /><span>30 LETTERS · 90 SECONDS</span></div>
      {active && <div className="lb-compose"><span>YOUR WORD</span><div className="lb-chosen">{chosen.length ? chosen.map(tile => <button key={tile.id} type="button" onClick={() => setSelected(current => current.filter(id => id !== tile.id))} aria-label={`Remove ${tile.letter} from word`}>{tile.letter}</button>) : <span>Tap letters to form a word</span>}</div><button type="button" onClick={() => setSelected(current => current.slice(0, -1))} disabled={!selected.length}>← Back</button></div>}
      <h2>Your letters</h2><div className="lb-rack">{view.rack.map(tile => <button type="button" key={tile.id} disabled={!active || busy || selected.includes(tile.id)} className={started ? "" : "masked"} onClick={() => setSelected(current => [...current, tile.id])} aria-label={started ? `Letter ${tile.letter}` : "Hidden letter"}>{tile.letter}</button>)}</div>
      <h2>Up next</h2><div className="lb-preview">{view.preview.map(tile => <span key={tile.id}>{tile.letter}</span>)}</div>
      <div className="lb-actions">{!started ? <button className="button" type="button" disabled={busy} onClick={() => act("start")}>Start</button> : <><button className="button" type="button" disabled={busy || selected.length < 3} onClick={() => act("words")}>Play word</button><button type="button" disabled={!selected.length || busy} onClick={() => setSelected([])}>Clear</button><button type="button" disabled={busy} onClick={() => act("finish")}>Finish early</button></>}</div>
    </div>}
    <p className="lb-feedback" role="status">{message}</p>
    {help && <div className="lb-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setHelp(false); }}><div role="dialog" aria-modal="true" aria-labelledby="lb-help-title" className="lb-dialog"><button autoFocus type="button" onClick={() => setHelp(false)} aria-label="Close instructions">×</button><h2 id="lb-help-title">How to play</h2><p>Make as many valid words as you can in 90 seconds. Tap at least three letters, then Play word. Used letters are replaced from the bag; the next five are shown above. Each word scores 1 point plus 1, 2, 3 and so on for each letter. A three-letter word scores 7. Repeated or invalid words do not use tiles.</p><p>Signed-in players get one scored attempt per UTC day.</p></div></div>}
  </section>;
}
