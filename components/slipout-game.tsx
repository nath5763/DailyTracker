"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { reachableRange } from "@/lib/slipout/movement";
import { loadBest, saveAttempt, saveBest } from "@/lib/slipout/persistence";
import { puzzleForDate, todayUtc, type Puzzle } from "@/lib/slipout/puzzles";
import { resultFromSession, shareText, type SlipOutResult } from "@/lib/slipout/results";
import { moveSession, readySession, startSession, type Session } from "@/lib/slipout/session";
import type { Block, Move } from "@/lib/slipout/model";

type ServerStart = { attemptId: string };
type ServerFinish = { result: SlipOutResult; best: SlipOutResult | null };
type ServerToday = { puzzle: Puzzle; best: SlipOutResult | null };
type Drag = { pointerId: number; id: string; origin: number; start: number; cell: number; min: number; max: number };

async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`/api/v1/slipout/today${path}`, { method, credentials: "same-origin", cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const value = await response.json();
  if (!response.ok) throw new Error(value.message || value.error || "Could not save this attempt.");
  return value as T;
}

export function SlipOutGame({ signedIn }: { signedIn: boolean }) {
  const [puzzle, setPuzzle] = useState(() => puzzleForDate(todayUtc()));
  const [session, setSession] = useState(() => readySession(puzzle));
  const sessionRef = useRef(session);
  const [best, setBest] = useState<SlipOutResult | null>(null);
  const [result, setResult] = useState<SlipOutResult | null>(null);
  const [drag, setDrag] = useState<{ id: string; to: number } | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const attemptRef = useRef<string | null>(null);
  const finishingRef = useRef(false);
  const startingRef = useRef(false);
  const [serverEnabled, setServerEnabled] = useState(signedIn);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [help, setHelp] = useState(false);

  const setLiveSession = useCallback((next: Session) => { sessionRef.current = next; setSession(next); }, []);
  useEffect(() => {
    let live = true;
    const local = loadBest(puzzle.id, localStorage);
    setBest(local);
    if (signedIn) api<ServerToday>("").then(data => {
      if (!live) return;
      if (data.puzzle.id !== puzzle.id) { setPuzzle(data.puzzle); setLiveSession(readySession(data.puzzle)); }
      setBest(data.best);
    }).catch(() => { if (live) { setServerEnabled(false); setMessage("Online scores are unavailable. This device will keep your best result."); } });
    return () => { live = false; };
  }, [puzzle.id, signedIn, setLiveSession]);

  useEffect(() => {
    const cancel = () => { dragRef.current = null; setDrag(null); };
    window.addEventListener("resize", cancel);
    return () => window.removeEventListener("resize", cancel);
  }, []);
  useEffect(() => {
    if (!help) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setHelp(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [help]);

  async function finalize(finished: Session) {
    if (finishingRef.current) return;
    finishingRef.current = true;
    const localResult = resultFromSession(puzzle, finished, null);
    setResult(localResult);
    if (serverEnabled && attemptRef.current) {
      const attemptId = attemptRef.current;
      setBusy(true);
      try {
        const saved = await api<ServerFinish>("/finish", "POST", { attemptId, moves: finished.history });
        if (attemptRef.current === attemptId) { setResult(saved.result); setBest(saved.best); }
      } catch (error) { setMessage(error instanceof Error ? error.message : "Could not verify this result."); }
      finally { setBusy(false); }
    } else {
      try { saveAttempt(localResult, localStorage); setBest(saveBest(localResult, localStorage)); }
      catch { setMessage("This browser could not save your best result."); }
    }
  }

  async function start() {
    if (startingRef.current || sessionRef.current.status !== "READY") return;
    const currentDate = todayUtc();
    if (currentDate !== puzzle.date) {
      const nextPuzzle = puzzleForDate(currentDate);
      setPuzzle(nextPuzzle); setLiveSession(readySession(nextPuzzle)); setBest(null);
      setMessage("A new UTC daily puzzle is ready. Press Start again.");
      return;
    }
    startingRef.current = true; setBusy(true); setMessage("");
    try {
      if (serverEnabled) {
        const data = await api<ServerStart>("/start", "POST");
        attemptRef.current = data.attemptId;
      }
      setLiveSession(startSession(sessionRef.current, Date.now()));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not start the puzzle."); }
    finally { startingRef.current = false; setBusy(false); }
  }

  async function restart() {
    if (busy) return;
    const previous = sessionRef.current;
    const attemptId = attemptRef.current;
    dragRef.current = null; setDrag(null); setResult(null); setMessage("");
    attemptRef.current = null; finishingRef.current = false;
    setLiveSession(readySession(puzzle));
    if (previous.status === "PLAYING" && previous.startedAt !== null) {
      if (serverEnabled && attemptId) {
        setBusy(true);
        try { await api<ServerFinish>("/finish", "POST", { attemptId, moves: previous.history }); }
        catch { setMessage("The interrupted attempt could not be saved."); }
        finally { setBusy(false); }
      } else {
        const abandoned: Session = { ...previous, status: "RESTARTED", endedAt: Date.now() };
        try { saveAttempt(resultFromSession(puzzle, abandoned, null), localStorage); } catch { /* Retry remains available. */ }
      }
    }
  }

  function commit(move: Move) {
    const current = sessionRef.current;
    if (current.status !== "PLAYING") return;
    const next = moveSession(current, move, Date.now());
    if (next === current) return;
    setLiveSession(next);
    if (next.status === "COMPLETED") void finalize(next);
  }

  function pointerPosition(event: ReactPointerEvent<HTMLButtonElement>, active: Drag) {
    const coordinate = active.id && sessionRef.current.blocks.find(block => block.id === active.id)?.axis === "H" ? event.clientX : event.clientY;
    const to = Math.max(active.min, Math.min(active.max, active.origin + Math.round((coordinate - active.start) / active.cell)));
    return active.id === "X" && to === 5 && active.max === 6 ? 6 : to;
  }

  function pointerDown(event: ReactPointerEvent<HTMLButtonElement>, block: Block) {
    if (sessionRef.current.status !== "PLAYING" || dragRef.current || !boardRef.current) return;
    event.preventDefault();
    const [min, max] = reachableRange(sessionRef.current.blocks, block.id);
    const origin = block.axis === "H" ? block.x : block.y;
    dragRef.current = { pointerId: event.pointerId, id: block.id, origin,
      start: block.axis === "H" ? event.clientX : event.clientY, cell: boardRef.current.clientWidth / 6, min, max };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ id: block.id, to: origin });
  }

  function pointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = dragRef.current;
    if (active?.pointerId !== event.pointerId) return;
    const to = pointerPosition(event, active);
    setDrag(current => current?.to === to ? current : { id: active.id, to });
  }

  function pointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = dragRef.current;
    if (active?.pointerId !== event.pointerId) return;
    const to = pointerPosition(event, active);
    dragRef.current = null; setDrag(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    commit({ id: active.id, to });
  }

  function keyMove(event: ReactKeyboardEvent<HTMLButtonElement>, block: Block) {
    if (sessionRef.current.status !== "PLAYING") return;
    const horizontal = block.axis === "H";
    const backward = horizontal ? event.key === "ArrowLeft" : event.key === "ArrowUp";
    const forward = horizontal ? event.key === "ArrowRight" : event.key === "ArrowDown";
    if (!backward && !forward && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const [min, max] = reachableRange(sessionRef.current.blocks, block.id);
    const origin = horizontal ? block.x : block.y;
    let to = event.key === "Home" ? min : event.key === "End" ? max : origin + (backward ? -1 : 1);
    if (block.id === "X" && to === 5 && max === 6) to = 6;
    if (to >= min && to <= max) commit({ id: block.id, to });
  }

  const share = result ? shareText(puzzle, result, `${typeof window === "undefined" ? "" : window.location.origin}/daily/slipout`) : "";
  async function shareResult(native: boolean) {
    try {
      if (native && navigator.share) await navigator.share({ title: "SlipOut", text: share });
      else { await navigator.clipboard.writeText(share); setMessage("Result copied."); }
    } catch (error) { if ((error as DOMException).name !== "AbortError") setMessage("Could not share this result."); }
  }

  return <section className="so-page shell">
    <header className="so-heading"><div><p className="so-kicker">DAILY PUZZLE #{puzzle.number} · {puzzle.date} UTC</p><h1>SlipOut</h1></div><button type="button" className="so-text-button" onClick={() => setHelp(true)}>How to play</button></header>
    <div className="so-stats"><div><span>MOVES</span><strong>{session.history.length}</strong></div><div><span>BEST TODAY</span><strong className="so-best">{best ? `${best.moves} ${best.moves === 1 ? "move" : "moves"}` : "No finish yet"}</strong></div></div>
    <div className="so-main"><div className="so-board-shell"><div className="so-board" ref={boardRef} aria-label="SlipOut six by six sliding block board">
      {Array.from({ length: 36 }, (_, index) => <span className="so-cell" key={index} aria-hidden="true" />)}
      {session.status !== "READY" && session.blocks.map(block => {
        const visual = drag?.id === block.id ? drag.to : block.axis === "H" ? block.x : block.y;
        const x = block.axis === "H" ? visual : block.x;
        const y = block.axis === "V" ? visual : block.y;
        const style: CSSProperties = { left: `${x / 6 * 100}%`, top: `${y / 6 * 100}%`,
          width: `${(block.axis === "H" ? block.length : 1) / 6 * 100}%`, height: `${(block.axis === "V" ? block.length : 1) / 6 * 100}%` };
        return <button key={block.id} type="button" className={`so-block ${block.id === "X" ? "so-target" : block.id.charCodeAt(0) % 2 ? "so-lime" : "so-purple"} ${drag?.id === block.id ? "so-dragging" : ""} ${session.status === "COMPLETED" && block.id === "X" ? "so-exited" : ""}`}
          style={style} disabled={session.status !== "PLAYING"} aria-label={`${block.id === "X" ? "Target block" : "Block"} ${block.id}, ${block.axis === "H" ? "horizontal" : "vertical"}, row ${block.y + 1}, column ${block.x + 1}`}
          onPointerDown={event => pointerDown(event, block)} onPointerMove={pointerMove} onPointerUp={pointerUp}
          onPointerCancel={() => { dragRef.current = null; setDrag(null); }} onLostPointerCapture={() => { dragRef.current = null; setDrag(null); }}
          onKeyDown={event => keyMove(event, block)}><span className="so-block-face">{block.id === "X" ? <span className="so-target-mark">SLIP OUT →</span> : null}</span></button>;
      })}
      <div className="so-exit" aria-hidden="true"><span>EXIT →</span></div>
    </div></div><aside className="so-side"><p className="so-side-label">THE OBJECTIVE</p><h2>Clear a path to the right.</h2><p>Guide the pink target through the exit. Each slide counts as one move, no matter how far it travels.</p>{session.status === "COMPLETED" && <><div className="so-side-line" /><p>Today’s shortest solution <strong>{puzzle.optimalMoves} moves</strong></p></>}<p className="so-keyboard">Keyboard: focus a block, use arrow keys. Home or End slides it all the way.</p></aside></div>
    <div className="so-controls">{session.status === "READY" ? <button type="button" className="so-primary" onClick={() => void start()} disabled={busy}>Start puzzle →</button> : null}<button type="button" className="so-secondary" onClick={restart} disabled={busy || session.status === "READY"}>Restart</button><span className="so-status" role="status">{message}</span></div>
    {result && <div className="so-result" role="status"><p className="so-kicker">PUZZLE COMPLETE</p><h2>You slipped out.</h2><div className="so-result-numbers"><p><strong>{result.moves}</strong><span>moves</span></p><p><strong>{puzzle.optimalMoves}</strong><span>optimal moves</span></p></div><div className="so-result-actions"><button type="button" className="so-primary" onClick={restart} disabled={busy}>Play again</button><button type="button" className="so-secondary" onClick={() => void shareResult(true)}>Share results</button><button type="button" className="so-text-button" onClick={() => void shareResult(false)}>Copy results</button></div></div>}
    {help && <div className="so-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setHelp(false); }}><div className="so-modal" role="dialog" aria-modal="true" aria-labelledby="so-help-title"><button type="button" className="so-modal-close" onClick={() => setHelp(false)} aria-label="Close instructions">×</button><p className="so-kicker">HOW TO PLAY</p><h2 id="so-help-title">Slide. Clear. Escape.</h2><p>Move blocks only along their length. They cannot overlap or leave the board. Guide the pink target through the exit on the right.</p><p>Drag with a mouse or touch. A drag of any distance counts as one move. With a keyboard, focus a block and use the arrow keys; Home and End move it to the farthest open spot.</p><p>Fewer moves rank higher. Equal move counts share a rank. You can retry today’s puzzle as often as you like.</p></div></div>}
  </section>;
}
