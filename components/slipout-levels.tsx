"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type KeyboardEvent } from "react";
import catalog from "@/lib/slipout/levels.json";
import { applyLevelMove, initialLevelState, levelRange, type Axis, type Level, type LevelBlock, type LevelMove, type LevelState } from "@/lib/slipout/level-engine";

type Saved = { levelNumber: number; bestMoves: number; moves: LevelMove[] };
type Progress = { levelNumber: number; bestMoves: number };
type Drag = { pointerId: number; id: string; x: number; y: number; startX: number; startY: number; axis: "H" | "V" | null; to: number };
const levels = catalog as Level[];
const storageKey = "slipout:levels:v3";

function localProgress(): Saved[] {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(value) ? value.filter(item => Number.isInteger(item.levelNumber) && Array.isArray(item.moves)) : [];
  } catch { return []; }
}
async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`/api/v1/slipout/levels${path}`, { method, credentials: "same-origin", cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Could not save level progress.");
  return data as T;
}

export function SlipOutLevels({ signedIn }: { signedIn: boolean }) {
  const [progress, setProgress] = useState<Progress[]>([]);
  const [selected, setSelected] = useState(0);
  const [status, setStatus] = useState<"READY" | "PLAYING" | "COMPLETED">("READY");
  const [board, setBoard] = useState<LevelState>(initialLevelState(levels[0]));
  const [history, setHistory] = useState<LevelMove[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(signedIn);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const attemptRef = useRef<string | null>(null);
  const level = levels[selected];
  const unlocked = selected === 0 || progress.some(item => item.levelNumber === selected - 1);
  const nextUnlocked = selected < 15 && progress.some(item => item.levelNumber === selected);
  const best = progress.find(item => item.levelNumber === selected)?.bestMoves;
  const exitArrow = { left: "←", right: "→", top: "↑", bottom: "↓" }[level.exit.side];
  const exitStyle: CSSProperties = level.exit.side === "left" || level.exit.side === "right"
    ? { top: `${level.exit.cell / 6 * 100}%` }
    : { left: `${level.exit.cell / 6 * 100}%` };

  useEffect(() => {
    let live = true;
    localStorage.removeItem("slipout:levels:v1");
    localStorage.removeItem("slipout:levels:v2");
    const guest = localProgress();
    setProgress(guest.map(({ levelNumber, bestMoves }) => ({ levelNumber, bestMoves })));
    if (signedIn) {
      (async () => {
        const data = await request<{ progress: Progress[] }>("");
        if (live) setProgress(data.progress);
        if (guest.length) {
          const merged = await request<Progress[]>("/import", "POST",
            guest.sort((a, b) => a.levelNumber - b.levelNumber).map(({ levelNumber, moves }) => ({ levelNumber, moves })));
          if (live) setProgress(merged);
        }
      })().catch(error => { if (live) setMessage(error instanceof Error ? error.message : "Progress sync failed."); })
        .finally(() => { if (live) setSyncing(false); });
    }
    return () => { live = false; };
  }, [signedIn]);

  function choose(number: number) {
    if (busy || syncing || status === "PLAYING" || number > 0 && !progress.some(item => item.levelNumber === number - 1)) return;
    setSelected(number); setBoard(initialLevelState(levels[number])); setHistory([]); setStatus("READY"); setMessage("");
    attemptRef.current = null;
  }
  async function start() {
    if (status !== "READY" || busy || syncing || !unlocked) return;
    setBusy(true); setMessage("");
    try {
      if (signedIn) attemptRef.current = (await request<{ attemptId: string }>(`/${selected}/start`, "POST")).attemptId;
      setBoard(initialLevelState(level)); setHistory([]); setStatus("PLAYING");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not start level."); }
    finally { setBusy(false); }
  }
  async function finish(moves: LevelMove[]) {
    setBusy(true);
    try {
      if (signedIn && attemptRef.current) {
        const saved = await request<{ completed: boolean; progress: Progress[] }>("/finish", "POST",
          { attemptId: attemptRef.current, moves });
        if (!saved.completed) throw new Error("The level was not verified.");
        setProgress(saved.progress);
      } else {
        const saved = localProgress();
        const previous = saved.find(item => item.levelNumber === selected);
        if (!previous || moves.length < previous.bestMoves) {
          const updated = [...saved.filter(item => item.levelNumber !== selected),
            { levelNumber: selected, bestMoves: moves.length, moves }].sort((a, b) => a.levelNumber - b.levelNumber);
          localStorage.setItem(storageKey, JSON.stringify(updated));
          setProgress(updated.map(({ levelNumber, bestMoves }) => ({ levelNumber, bestMoves })));
        }
      }
      setStatus("COMPLETED");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save completion."); }
    finally { setBusy(false); }
  }
  async function restart() {
    if (busy) return;
    setBusy(true);
    try {
      if (status === "PLAYING" && signedIn && attemptRef.current)
        await request("/finish", "POST", { attemptId: attemptRef.current, moves: history });
      attemptRef.current = null;
      setBoard(initialLevelState(level)); setHistory([]); setStatus("READY"); setMessage(""); setDrag(null); dragRef.current = null;
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not restart."); }
    finally { setBusy(false); }
  }
  function commit(move: LevelMove) {
    if (status !== "PLAYING" || busy) return;
    try {
      const next = applyLevelMove(level, board, move);
      if (!next.moved) return;
      const moves = [...history, move];
      setBoard(next.state); setHistory(moves);
      if (next.exited) void finish(moves);
    } catch { /* Ignore gestures that do not make a legal slide. */ }
  }
  function gesture(event: PointerEvent<HTMLButtonElement>, active: Drag): Drag {
    const block = board.blocks.find(value => value.id === active.id)!;
    const dx = event.clientX - active.startX, dy = event.clientY - active.startY;
    const axis = block.id === "X" ? board.activeAxis : block.axis as Axis;
    const origin = axis === "H" ? active.x : active.y;
    const [min, max] = levelRange(level, board, active.id, axis);
    let to = Math.max(min, Math.min(max, origin + Math.round((axis === "H" ? dx : dy) / (boardRef.current!.clientWidth / 6))));
    if (active.id === "X" && max === 6 && to >= 6 - (axis === "H" ? block.width : block.height) &&
        (axis === "H" ? dx : dy) > (6 - (axis === "H" ? block.width : block.height) - origin + .4) * boardRef.current!.clientWidth / 6) to = 6;
    return { ...active, axis, to };
  }
  function keyMove(event: KeyboardEvent<HTMLButtonElement>, block: LevelBlock) {
    const axis = event.key === "ArrowLeft" || event.key === "ArrowRight" ? "H" :
      event.key === "ArrowUp" || event.key === "ArrowDown" ? "V" : null;
    if (!axis || (block.id === "X" ? board.activeAxis !== axis : block.axis !== axis)) return;
    event.preventDefault();
    const origin = axis === "H" ? block.x : block.y;
    const [min, max] = levelRange(level, board, block.id, axis);
    let to = Math.max(min, Math.min(max, origin + (event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1)));
    if (block.id === "X" && max === 6 && origin === 6 - (axis === "H" ? block.width : block.height) &&
        (event.key === "ArrowRight" || event.key === "ArrowDown")) to = 6;
    commit({ id: block.id, axis, to });
  }

  return <section className="so-page so-level-page shell">
    <header className="so-heading"><div><p className="so-kicker">15 LEVELS · THREE DIFFICULTIES</p><h1>SlipOut Levels</h1></div><Link className="so-text-button" href="/daily/slipout">Daily puzzle →</Link></header>
    <p>Complete the tutorial to unlock level 1. Finish each level to unlock the next.</p>
    <div className="so-tutorial-entry"><button type="button" className={selected === 0 ? "selected" : ""} disabled={busy || syncing || status === "PLAYING"} onClick={() => choose(0)}>Tutorial {progress.some(item => item.levelNumber === 0) ? "Completed" : "Ready"}</button><span>Learn how the direction switch works, with no obstacles.</span></div>
    <div className="so-level-list">{(["easy", "medium", "hard"] as const).map(difficulty => <div key={difficulty}><h2>{difficulty}</h2><div className="so-level-buttons">{levels.filter(item => item.difficulty === difficulty).map(item => {
      const score = progress.find(value => value.levelNumber === item.number)?.bestMoves;
      const open = progress.some(value => value.levelNumber === item.number - 1);
      return <button type="button" key={item.id} className={selected === item.number ? "selected" : ""}
        disabled={!open || busy || syncing || status === "PLAYING"} onClick={() => choose(item.number)}
        aria-label={`Level ${item.number}, ${open ? score ? `best ${score} moves` : "unlocked" : "locked"}`}>
        <strong>{item.number}</strong><small>{!open ? "Locked" : score ? `${score} moves` : "Ready"}</small></button>;
    })}</div></div>)}</div>
    <div className="so-stats"><div><span>{selected === 0 ? "TUTORIAL" : `LEVEL ${selected} · ${level.difficulty.toUpperCase()}`}</span><strong>{level.blocks[0].width}×{level.blocks[0].height} target</strong></div><div><span>MOVES</span><strong>{history.length}</strong></div><div><span>ACTIVE AXIS</span><strong className="so-axis-indicator">{board.activeAxis === "H" ? "↔ Horizontal" : "↕ Vertical"}</strong></div></div>
    <p className="so-level-best">{selected === 0 ? "Land on the switch, then head to the exit." : `Best: ${best ? `${best} moves` : "No finish yet"} · Exit: ${level.exit.side} side`}</p>
    <div className="so-main"><div className="so-board-shell"><div className="so-board" ref={boardRef} aria-label={`SlipOut level ${selected} board`}>
      {Array.from({ length: 36 }, (_, index) => <span className="so-cell" key={index} aria-hidden="true" />)}
      {status !== "READY" && level.switches.map(cell => {
        const covered = board.blocks.some(block => cell.x >= block.x && cell.x < block.x + block.width &&
          cell.y >= block.y && cell.y < block.y + block.height);
        return <span key={`${cell.x},${cell.y}`} className={`so-switch ${covered ? "so-switch-covered" : ""}`}
          style={{ left: `${cell.x / 6 * 100}%`, top: `${cell.y / 6 * 100}%` }}
          aria-label={`Direction switch at row ${cell.y + 1}, column ${cell.x + 1}`}>
          <span>↔<br/>↕</span></span>;
      })}
      {status !== "READY" && board.blocks.map(block => {
        const preview = drag?.id === block.id && drag.axis ? drag : null;
        const x = preview?.axis === "H" ? preview.to : block.x;
        const y = preview?.axis === "V" ? preview.to : block.y;
        const style: CSSProperties = { left: `${x / 6 * 100}%`, top: `${y / 6 * 100}%`, width: `${block.width / 6 * 100}%`, height: `${block.height / 6 * 100}%` };
        return <button type="button" key={block.id} style={style} disabled={status !== "PLAYING" || busy}
          className={`so-block ${block.id === "X" ? "so-target" : block.id.charCodeAt(0) % 2 ? "so-lime" : "so-purple"} ${status === "COMPLETED" && block.id === "X" ? "so-exited" : ""}`}
          aria-label={`${block.id === "X" ? `Target, active axis ${board.activeAxis === "H" ? "horizontal" : "vertical"}` : "Block"} ${block.id}, row ${block.y + 1}, column ${block.x + 1}`}
          onPointerDown={event => { if (status !== "PLAYING" || busy) return; event.preventDefault();
            const active: Drag = { pointerId: event.pointerId, id: block.id, x: block.x, y: block.y,
              startX: event.clientX, startY: event.clientY, axis: null, to: block.x };
            dragRef.current = active; event.currentTarget.setPointerCapture(event.pointerId); setDrag(active); }}
          onPointerMove={event => { if (dragRef.current?.pointerId !== event.pointerId) return;
            const next = gesture(event, dragRef.current); dragRef.current = next; setDrag(next); }}
          onPointerUp={event => { if (dragRef.current?.pointerId !== event.pointerId) return;
            const next = gesture(event, dragRef.current); dragRef.current = null; setDrag(null);
            if (next.axis) commit({ id: next.id, axis: next.axis, to: next.to }); }}
          onPointerCancel={() => { dragRef.current = null; setDrag(null); }}
          onKeyDown={event => keyMove(event, block)}><span className="so-block-face">{block.id === "X" ? board.activeAxis === "H" ? "↔" : "↕" : null}</span></button>;
      })}<div className={`so-exit so-level-exit so-exit-${level.exit.side}`} style={exitStyle} aria-label={`Exit on the ${level.exit.side} side at cell ${level.exit.cell + 1}`}><span>EXIT {exitArrow}</span></div>
    </div></div><aside className="so-side"><p className="so-side-label">THE OBJECTIVE</p><h2>{selected === 0 ? "Learn the direction switch." : "Switch direction, find the exit."}</h2>{selected === 0 && status !== "COMPLETED" && <p className="so-tutorial-prompt" role="status">{board.activeAxis === "H" ? "Slide the pink target horizontally onto the marked switch. You can pass over it, but must stop on it to change direction." : "The target now moves vertically. Slide it down through the exit."}</p>}<p>The pink target slides only along its active axis. Land on a marked switch to toggle between horizontal and vertical movement. Passing over a switch does nothing.</p><p>Slide the target through the one-cell opening on the {level.exit.side} side. Other blocks move along their length and do not activate switches. Each slide counts as one move.</p>{status === "COMPLETED" && <p>{selected === 0 ? "Tutorial complete!" : <>Optimal solution: <strong>{level.optimalMoves} moves</strong></>}</p>}</aside></div>
    <div className="so-controls">{status === "READY" && <button type="button" className="so-primary" disabled={busy || syncing || !unlocked} onClick={() => void start()}>{selected === 0 ? "Start tutorial →" : `Start level ${selected} →`}</button>}
      <button type="button" className="so-secondary" disabled={busy || status === "READY"} onClick={() => void restart()}>Restart</button><span className="so-status" role="status">{message}</span></div>
    {status === "COMPLETED" && <div className="so-result" role="status"><p className="so-kicker">{selected === 0 ? "TUTORIAL COMPLETE" : "LEVEL COMPLETE"}</p><h2>{selected === 0 ? "You switched directions!" : `${history.length} moves.`}</h2>{selected !== 0 && <p>Optimal: {level.optimalMoves} moves.</p>}<div className="so-result-actions"><button type="button" className="so-primary" onClick={() => choose(nextUnlocked ? selected + 1 : selected)}>{nextUnlocked ? "Next level →" : "Play again"}</button></div></div>}
  </section>;
}
