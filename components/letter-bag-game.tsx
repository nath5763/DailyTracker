"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import type { Round, Tile, Word } from "@/lib/letter-bag/engine";
import { LetterBagPlayHistory, LetterBagTileFace, potentialWordPoints } from "@/components/letter-bag-play-details";
import { reconcileTileDisplayOrder, shuffleTileDisplayOrder, tilesInDisplayOrder } from "@/lib/letter-bag/display-order";
import { baseWordPoints, letterBonus } from "@/lib/letter-bag/scoring";
import { invalidateDashboardCache } from "@/lib/client-cache";

type View = { date: string; gameNumber: string; rack: Tile[]; preview: Tile[]; bagRemaining: number; words: Word[]; score: number; startedAt: number | null; endedAt: number | null };
const day = () => new Date().toISOString().slice(0, 10);
function localView(round: Round): View { return { date: round.date, gameNumber: round.date.replaceAll("-", ""), rack: round.startedAt === null ? round.rack.map(t => ({ ...t, letter: "?" })) : round.rack, preview: round.bag.slice(0, 5).map(t => round.startedAt === null ? { ...t, letter: "?" } : t), bagRemaining: round.bag.length, words: round.words, score: round.score, startedAt: round.startedAt, endedAt: round.endedAt }; }
async function request(path: string, method = "GET", ids?: number[]): Promise<View> {
  const response = await fetch(`/api/v1/letter-bag/today${path}`, { method, credentials: "same-origin", headers: ids ? { "Content-Type": "application/json" } : undefined, body: ids ? JSON.stringify({ ids }) : undefined, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Could not load Letter Bag.");
  return data;
}
export function LetterBagGame({ saved, userId }: { saved: boolean; userId?: string | null }) {
  const [view, setView] = useState<View | null>(null);
  const [local, setLocal] = useState<Round | null>(null);
  const [practice, setPractice] = useState(false);
  const [dailyResult, setDailyResult] = useState<View | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [displayOrder, setDisplayOrder] = useState<number[]>([]);
  const [freshTiles, setFreshTiles] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [help, setHelp] = useState(false);
  useEffect(() => { if (!help) return; const close = (event: KeyboardEvent) => { if (event.key === "Escape") setHelp(false); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [help]);
  useEffect(() => { let live = true; if (saved) request("").then(v => { if (live) { setView(v); setDisplayOrder(v.rack.map(tile => tile.id)); } }).catch(e => { if (live) setMessage(e.message); }); else import("@/lib/letter-bag/engine").then(engine => { if (live) { const round = engine.createRound(day()); const nextView = localView(round); setLocal(round); setView(nextView); setDisplayOrder(nextView.rack.map(tile => tile.id)); } }); return () => { live = false; }; }, [saved]);
  const act = useCallback(async (action: "start" | "words" | "finish") => {
    if (!view || busy) return;
    setBusy(true); setMessage("");
    try {
      let nextView: View | null = null;
      if (saved && !practice) nextView = await request(`/${action}`, "POST", action === "words" ? selected : undefined);
      else if (local) {
        const engine = await import("@/lib/letter-bag/engine");
        let round: Round = local;
        if (action === "start") round = { ...(practice || round.date === day() ? round : engine.createRound(day())), startedAt: Date.now() };
        if (action === "words") { const result = engine.submit(round, selected); round = result.round; if (result.error) setMessage(result.error); }
        if (action === "finish") round = engine.finish(round);
        setLocal(round); nextView = localView(round);
      }
      if (nextView) {
        if (saved && !practice && view.endedAt === null && nextView.endedAt !== null) {
          invalidateDashboardCache(userId);
        }
        const oldIds = new Set(view.rack.map(tile => tile.id));
        setFreshTiles(action === "words" && nextView.words.length > view.words.length
          ? nextView.rack.filter(tile => !oldIds.has(tile.id)).map(tile => tile.id) : []);
        if (action === "words" && nextView.words.length > view.words.length) {
          const played = nextView.words.at(-1)!;
          const base = baseWordPoints(played.word.length);
          setMessage(`${played.word.toUpperCase()} earned ${played.points} points (${base} base + ${played.points - base} letter bonus).`);
        }
        setDisplayOrder(current => reconcileTileDisplayOrder(current, nextView.rack));
        setView(nextView);
      }
      setSelected([]);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Something went wrong."); if (saved && !practice) request("").then(recovered => { setView(recovered); setDisplayOrder(current => reconcileTileDisplayOrder(current, recovered.rack)); }).catch(() => {}); }
    finally { setBusy(false); }
  }, [view, busy, saved, practice, selected, local, userId]);
  const replay = useCallback(async () => {
    if (!view || busy) return;
    setBusy(true); setMessage("");
    try {
      let round: Round;
      if (saved) {
        const response = await fetch("/api/v1/letter-bag/today/replay", { credentials: "same-origin", cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not replay Letter Bag.");
        round = data as Round;
        if (!practice) setDailyResult(view);
      } else {
        const engine = await import("@/lib/letter-bag/engine");
        round = engine.createRound(view.date);
      }
      const nextView = localView(round);
      setLocal(round); setView(nextView); setDisplayOrder(nextView.rack.map(tile => tile.id)); setPractice(saved); setSelected([]); setFreshTiles([]);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not replay Letter Bag."); }
    finally { setBusy(false); }
  }, [view, busy, saved, practice]);
  if (!view) return <section className="shell letter-bag"><h1>Letter Bag</h1><p role="status">{message || "Loading today’s game…"}</p></section>;
  const started = view.startedAt !== null;
  const ended = view.endedAt !== null;
  const active = started && !ended;
  const displayedRack = tilesInDisplayOrder(view.rack, displayOrder);
  const chosen = selected.map(id => view.rack.find(tile => tile.id === id)).filter((tile): tile is Tile => !!tile);
  const potential = potentialWordPoints(chosen.map(tile => tile.letter).join(""));
  const longest = Math.max(0, ...view.words.map(word => word.word.length));
  const scored = saved && !practice;
  const share = `Letter Bag #${view.gameNumber}\nScore: ${view.score}\nWords: ${view.words.length}\nLongest word: ${longest} letters${scored ? "" : practice ? "\nPractice replay" : "\nUnsaved round"}\n${typeof window === "undefined" ? "" : `${window.location.origin}/daily/letter-bag`}`;
  return <section className="shell letter-bag">
    <div className="lb-top"><div><p className="section-number">DAILY GAME #{view.gameNumber}</p><h1>Letter Bag</h1><p>{practice ? "Practice replay · score not saved" : saved ? "Your one scored attempt today" : "Guest round · unsaved"}</p></div><button type="button" className="secondary-link" onClick={() => setHelp(true)}>How to play</button></div>
    <div className="lb-stats lb-daily-stats"><div><span>SCORE</span><strong>{view.score}</strong></div><div><span>BAG</span><strong>{view.bagRemaining}</strong></div></div>
    {ended ? <div className="lb-result"><p className="section-number">{scored ? "DAILY RESULT" : practice ? "PRACTICE RESULT" : "UNSAVED RESULT"}</p><h2>{view.score} points</h2><p>{view.words.length} words · longest {longest} letters</p>{scored ? <p>Replay uses the same letters for practice. Your daily score stays saved.</p> : null}<div className="lb-actions"><button className="button" type="button" onClick={() => navigator.clipboard.writeText(share).then(() => setMessage("Result copied.")).catch(() => setMessage("Could not copy result."))}>Copy result</button><button type="button" disabled={busy} onClick={() => void replay()}>{busy ? "Preparing replay…" : "Replay"}</button>{practice && dailyResult ? <button type="button" onClick={() => { setView(dailyResult); setLocal(null); setPractice(false); setSelected([]); setFreshTiles([]); setMessage(""); }}>View daily result</button> : null}</div>{view.words.length > 0 && <div className="lb-history"><h3>Words played</h3>{[...view.words].reverse().map((word, i) => <div key={i}>{word.word}<b>+{word.points}</b></div>)}</div>}</div> : <div className="lb-play-layout"><div className="lb-board">
      <div className="lb-bag"><Image src="/letter-bag/letter-bag.webp" width={500} height={300} alt="" /><span>30 LETTERS · NO TIME LIMIT</span></div>
      {active && <div className="lb-compose"><div className="lb-compose-heading"><span>YOUR WORD</span><strong aria-live="polite">Potential +{potential.total} pts</strong></div><div className="lb-chosen">{chosen.length ? chosen.map(tile => <button key={tile.id} type="button" onClick={() => setSelected(current => current.filter(id => id !== tile.id))} aria-label={`Remove ${tile.letter} from word`}><LetterBagTileFace letter={tile.letter} /></button>) : <span>Tap letters to form a word</span>}</div><small>{potential.base} base + {potential.bonus} letter bonus. {chosen.length < 3 ? "Select at least 3 tiles to score." : "Points count when a valid word is played."}</small><button type="button" onClick={() => setSelected(current => current.slice(0, -1))} disabled={!selected.length}>← Back</button></div>}
      <div className="lb-rack-heading"><h2>Your letters</h2>{active && <button className="lb-shuffle" type="button" disabled={busy} onClick={() => setDisplayOrder(current => shuffleTileDisplayOrder(reconcileTileDisplayOrder(current, view.rack)))}>Shuffle</button>}</div><div className="lb-rack">{displayedRack.map(tile => <button type="button" key={tile.id} disabled={!active || busy || selected.includes(tile.id)} className={[!started && "masked", selected.includes(tile.id) && "lb-selected", freshTiles.includes(tile.id) && "lb-fresh"].filter(Boolean).join(" ")} onClick={() => setSelected(current => [...current, tile.id])} aria-label={started ? `Letter ${tile.letter}${letterBonus(tile.letter) ? `, ${letterBonus(tile.letter)} bonus points` : ""}` : "Hidden letter"}><LetterBagTileFace letter={tile.letter} /></button>)}</div>
      <h2>Up next</h2><div className="lb-preview">{view.preview.map(tile => <span key={tile.id}><LetterBagTileFace letter={tile.letter} /></span>)}</div>
      <div className="lb-actions">{!started ? <button className="button" type="button" disabled={busy} onClick={() => act("start")}>Start</button> : <><button className="button" type="button" disabled={busy || selected.length < 3} onClick={() => act("words")}>Play word</button><button type="button" disabled={!selected.length || busy} onClick={() => setSelected([])}>Clear</button><button type="button" disabled={busy} onClick={() => act("finish")}>Finish game</button></>}</div>
    </div><LetterBagPlayHistory words={view.words} /></div>}
    <p className="lb-feedback" role="status">{message}</p>
    {help && <div className="lb-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setHelp(false); }}><div role="dialog" aria-modal="true" aria-labelledby="lb-help-title" className="lb-dialog"><button autoFocus type="button" onClick={() => setHelp(false)} aria-label="Close instructions">×</button><h2 id="lb-help-title">How to play</h2><p>Make as many valid words as you can from 30 letters, with no time limit. You begin with 15 letters; used letters are replaced from the bag, and the next five are visible. Longer words earn progressively more points. Q and Z add 2 points each; J, X, K, and V add 1 each. Bonuses apply to every occurrence. Repeated or invalid words do not use tiles. Earn the highest score you can, then finish when you are done.</p><p>Signed-in players get one scored attempt per UTC day. After it ends, Replay lets you practice with the same letters without changing your saved score.</p></div></div>}
  </section>;
}
