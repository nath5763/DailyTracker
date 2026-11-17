"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type KeyboardEvent } from "react";
import catalog from "@/lib/slipout/levels.json";
import { applyLevelMove, initialLevelState, levelRange, type Axis, type Level, type LevelBlock, type LevelMove, type LevelState } from "@/lib/slipout/level-engine";

type Saved = { levelNumber: number; bestMoves: number; moves: LevelMove[]; catalogId?: string };
type Progress = { levelNumber: number; bestMoves: number; legacy?: boolean };
type Drag = { pointerId: number; id: string; x: number; y: number; startX: number; startY: number; axis: "H" | "V" | null; to: number };
const levels = catalog as Level[];
const tiers = ["easy", "medium", "hard"] as const;
const tierLevels = Object.fromEntries(tiers.map(tier => [tier, levels.filter(level => level.difficulty === tier)
  .sort((a, b) => a.optimalMoves - b.optimalMoves || a.number - b.number)])) as Record<(typeof tiers)[number], Level[]>;
const storageKey = "slipout:levels:v3";

function storedProgress(): Saved[] {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(value) ? value.filter(item => Number.isInteger(item.levelNumber) &&
      !!levels[item.levelNumber] && Array.isArray(item.moves)) : [];
  } catch { return []; }
}
function currentBoard(item: Saved): boolean {
  const id = levels[item.levelNumber].id;
  return item.catalogId ? item.catalogId === id : !id.includes("-v6-");
}
function localProgress(): Saved[] { return storedProgress().filter(currentBoard); }
function guestProgress(): Progress[] {
  const saved = localProgress();
  const current = new Set(saved.map(item => item.levelNumber));
  return [...saved.map(({ levelNumber, bestMoves }) => ({ levelNumber, bestMoves })),
    ...storedProgress().filter(item => !currentBoard(item) && !current.has(item.levelNumber))
      .map(({ levelNumber, bestMoves }) => ({ levelNumber, bestMoves, legacy: true }))];
}
async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`/api/v1/slipout/levels${path}`, { method, credentials: "same-origin", cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Could not save level progress.");
  return data as T;
}

export function SlipOutLevels({ signedIn, mode = "levels", active = true, onAttemptStateChange }: {
  signedIn: boolean; mode?: "levels" | "tutorial"; active?: boolean;
  onAttemptStateChange?: (mode: "levels" | "how-to-play", playing: boolean) => void
}) {
  const [progress, setProgress] = useState<Progress[]>([]);
  const [selected, setSelected] = useState(mode === "tutorial" ? 0 : tierLevels.easy[0].number);
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
  const startingRef = useRef(false);
  const level = levels[selected];
  const sequence = level.difficulty === "tutorial" ? [] : tierLevels[level.difficulty];
  const tierIndex = sequence.findIndex(item => item.number === selected);
  const previous = tierIndex > 0 ? sequence[tierIndex - 1].number : 0;
  const unlocked = selected === 0 || progress.some(item => item.levelNumber === selected || item.levelNumber === previous);
  const nextLevel = selected === 0 ? tierLevels.easy[0] : sequence[tierIndex + 1];
  const nextUnlocked = !!nextLevel && progress.some(item => item.levelNumber === selected);
  const selectedProgress = progress.find(item => item.levelNumber === selected);
  const best = selectedProgress?.legacy ? undefined : selectedProgress?.bestMoves;
  const exitArrow = { left: "←", right: "→", top: "↑", bottom: "↓" }[level.exit.side];
  const exitStyle: CSSProperties = level.exit.side === "left" || level.exit.side === "right"
    ? { top: `${level.exit.cell / 6 * 100}%` }
    : { left: `${level.exit.cell / 6 * 100}%` };

  useEffect(() => {
    onAttemptStateChange?.(mode === "tutorial" ? "how-to-play" : "levels",
      status === "PLAYING" || (busy && attemptRef.current !== null));
  }, [mode, status, busy, onAttemptStateChange]);

  useEffect(() => {
    if (!active) return;
    let live = true;
    if (signedIn) setSyncing(true);
    localStorage.removeItem("slipout:levels:v1");
    localStorage.removeItem("slipout:levels:v2");
    const guest = localProgress();
    setProgress(guestProgress());
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
  }, [signedIn, active]);

  function choose(number: number) {
    const candidate = levels[number];
    const order = candidate?.difficulty === "tutorial" ? [] : tierLevels[candidate.difficulty];
    const index = order?.findIndex(item => item.number === number) ?? -1;
    const predecessor = index > 0 ? order[index - 1].number : 0;
    if (!candidate || busy || startingRef.current || syncing || status === "PLAYING" || number > 0 &&
        !progress.some(item => item.levelNumber === number || item.levelNumber === predecessor)) return;
    setSelected(number); setBoard(initialLevelState(levels[number])); setHistory([]); setStatus("READY"); setMessage("");
    attemptRef.current = null;
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
          const updated = [...storedProgress().filter(item => item.levelNumber !== selected || !currentBoard(item)),
            { levelNumber: selected, bestMoves: moves.length, moves, catalogId: level.id }].sort((a, b) => a.levelNumber - b.levelNumber);
          localStorage.setItem(storageKey, JSON.stringify(updated));
          setProgress(guestProgress());
        }
      }
      setStatus("COMPLETED");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save completion."); }
    finally { setBusy(false); }
  }
  async function restart() {
    if (busy || startingRef.current) return;
    setBusy(true);
    try {
      if (status === "PLAYING" && signedIn && attemptRef.current)
        await request("/finish", "POST", { attemptId: attemptRef.current, moves: history });
      attemptRef.current = null;
      setBoard(initialLevelState(level)); setHistory([]); setStatus("READY"); setMessage(""); setDrag(null); dragRef.current = null;
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not restart."); }
    finally { setBusy(false); }
  }
  async function commit(move: LevelMove) {
    if (status === "COMPLETED" || busy || syncing || startingRef.current || !unlocked) return;
    try {
      const next = applyLevelMove(level, board, move);
      if (!next.moved) return;
      if (status === "READY" && signedIn) {
        startingRef.current = true;
        setBusy(true); setMessage("");
        try {
          attemptRef.current = (await request<{ attemptId: string }>(`/${selected}/start`, "POST")).attemptId;
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "Could not start level.");
          return;
        } finally {
          startingRef.current = false;
          setBusy(false);
        }
      }
      const moves = [...history, move];
      setBoard(next.state); setHistory(moves); setStatus("PLAYING");
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
    void commit({ id: block.id, axis, to });
  }

  return <section className={`so-level-page so-mode-panel ${mode === "tutorial" ? "so-tutorial-panel" : ""}`} aria-label={mode === "tutorial" ? "SlipOut tutorial" : "SlipOut levels"}>
    {mode === "tutorial" ? <div className="so-section-intro"><div><p className="so-kicker">HOW TO PLAY</p><h2>Learn the direction switch.</h2><p>Slide blocks along their length. Stop the pink target on a switch to change its active direction, then guide it through the exit. Drag with a mouse or touch, or focus a block and use the arrow keys. Each slide counts as one move.</p><p>The daily puzzle starts with the Start button and has no time limit. Fewer moves rank higher; you can retry it as often as you like.</p></div><div className="so-tutorial-progress"><span>{progress.some(item => item.levelNumber === 0) ? "✓ Tutorial completed" : "Tutorial ready"}</span>{progress.some(item => item.levelNumber === 0) && <button type="button" className="so-secondary" disabled={busy || syncing} onClick={() => void restart()}>Replay tutorial</button>}</div></div>
      : <><div className="so-section-intro"><div><p className="so-kicker">90 LEVELS · THREE DIFFICULTIES</p><h2>Choose a level</h2><p>Complete the tutorial to unlock the first puzzle in each difficulty. Each difficulty progresses independently.</p></div></div>
    <div className="so-level-list">{tiers.map(difficulty => <div key={difficulty}><h2>{difficulty}</h2><div className="so-level-buttons">{tierLevels[difficulty].map((item, index) => {
      const completion = progress.find(value => value.levelNumber === item.number);
      const score = completion?.legacy ? undefined : completion?.bestMoves;
      const prior = index > 0 ? tierLevels[difficulty][index - 1].number : 0;
      const open = progress.some(value => value.levelNumber === item.number || value.levelNumber === prior);
      return <button type="button" key={item.id} className={selected === item.number ? "selected" : ""}
        disabled={!open || busy || syncing || status === "PLAYING"} onClick={() => choose(item.number)}
        aria-label={`${difficulty} level ${index + 1}, ${open ? score ? `best ${score} moves` : completion?.legacy ? "previously completed" : "unlocked" : "locked"}`}>
        <strong>{index + 1}</strong><small>{!open ? "Locked" : score ? `${score} moves` : completion?.legacy ? "Replay" : "Ready"}</small></button>;
    })}</div></div>)}</div></>}
    <div className="so-stats"><div><span>{selected === 0 ? "TUTORIAL" : `${level.difficulty.toUpperCase()} ${tierIndex + 1} OF ${sequence.length}`}</span><strong>{level.blocks[0].width}×{level.blocks[0].height} target</strong></div><div><span>MOVES</span><strong>{history.length}</strong></div><div><span>ACTIVE AXIS</span><strong className="so-axis-indicator">{board.activeAxis === "H" ? "↔ Horizontal" : "↕ Vertical"}</strong></div></div>
    <p className="so-level-best">{selected === 0 ? "Land on the switch, then head to the exit." :
      `${selectedProgress?.legacy ? "Previous board completed" : `Best: ${best ? `${best} moves` : "No finish yet"}`} · Exit: ${level.exit.side} side`}</p>
    <div className="so-main"><div className="so-board-shell"><div className="so-board" ref={boardRef} aria-label={selected === 0 ? "SlipOut tutorial board" : `SlipOut ${level.difficulty} level ${tierIndex + 1} board`}>
      {Array.from({ length: 36 }, (_, index) => <span className="so-cell" key={index} aria-hidden="true" />)}
      {level.switches.map(cell => {
        const covered = board.blocks.some(block => cell.x >= block.x && cell.x < block.x + block.width &&
          cell.y >= block.y && cell.y < block.y + block.height);
        return <span key={`${cell.x},${cell.y}`} className={`so-switch ${covered ? "so-switch-covered" : ""}`}
          style={{ left: `${cell.x / 6 * 100}%`, top: `${cell.y / 6 * 100}%` }}
          aria-label={`Direction switch at row ${cell.y + 1}, column ${cell.x + 1}`}>
          <span>↔<br/>↕</span></span>;
      })}
      {board.blocks.map(block => {
        const preview = drag?.id === block.id && drag.axis ? drag : null;
        const x = preview?.axis === "H" ? preview.to : block.x;
        const y = preview?.axis === "V" ? preview.to : block.y;
        const style: CSSProperties = { left: `${x / 6 * 100}%`, top: `${y / 6 * 100}%`, width: `${block.width / 6 * 100}%`, height: `${block.height / 6 * 100}%` };
        return <button type="button" key={block.id} style={style} disabled={status === "COMPLETED" || busy || syncing || !unlocked}
          className={`so-block ${block.id === "X" ? "so-target" : block.id.charCodeAt(0) % 2 ? "so-lime" : "so-purple"} ${status === "COMPLETED" && block.id === "X" ? "so-exited" : ""}`}
          aria-label={`${block.id === "X" ? `Target, active axis ${board.activeAxis === "H" ? "horizontal" : "vertical"}` : "Block"} ${block.id}, row ${block.y + 1}, column ${block.x + 1}`}
          onPointerDown={event => { if (status === "COMPLETED" || busy || syncing || !unlocked) return; event.preventDefault();
            const active: Drag = { pointerId: event.pointerId, id: block.id, x: block.x, y: block.y,
              startX: event.clientX, startY: event.clientY, axis: null, to: block.x };
            dragRef.current = active; event.currentTarget.setPointerCapture(event.pointerId); setDrag(active); }}
          onPointerMove={event => { if (dragRef.current?.pointerId !== event.pointerId) return;
            const next = gesture(event, dragRef.current); dragRef.current = next; setDrag(next); }}
          onPointerUp={event => { if (dragRef.current?.pointerId !== event.pointerId) return;
            const next = gesture(event, dragRef.current); dragRef.current = null; setDrag(null);
            if (next.axis) void commit({ id: next.id, axis: next.axis, to: next.to }); }}
          onPointerCancel={() => { dragRef.current = null; setDrag(null); }}
          onKeyDown={event => keyMove(event, block)}><span className="so-block-face">{block.id === "X" ? board.activeAxis === "H" ? "↔" : "↕" : null}</span></button>;
      })}<div className={`so-exit so-level-exit so-exit-${level.exit.side}`} style={exitStyle} aria-label={`Exit on the ${level.exit.side} side at cell ${level.exit.cell + 1}`}><span>EXIT {exitArrow}</span></div>
    </div></div><aside className="so-side"><p className="so-side-label">THE OBJECTIVE</p><h2>{selected === 0 ? "Learn the direction switch." : "Switch direction, find the exit."}</h2>{selected === 0 && status !== "COMPLETED" && <p className="so-tutorial-prompt" role="status">{board.activeAxis === "H" ? "Slide the pink target horizontally onto the marked switch. You can pass over it, but must stop on it to change direction." : "The target now moves vertically. Slide it down through the exit."}</p>}<p>The pink target slides only along its active axis. Land on a marked switch to toggle between horizontal and vertical movement. Passing over a switch does nothing.</p><p>Slide the target through the one-cell opening on the {level.exit.side} side. Other blocks move along their length and do not activate switches. Each slide counts as one move.</p>{status === "COMPLETED" && <p>{selected === 0 ? "Tutorial complete!" : <>Optimal solution: <strong>{level.optimalMoves} moves</strong></>}</p>}</aside></div>
    <div className="so-controls"><button type="button" className="so-secondary" disabled={busy || syncing} onClick={() => void restart()}>Restart</button><span className="so-status" role="status">{message}</span></div>
    {status === "COMPLETED" && <div className="so-result" role="status"><p className="so-kicker">{selected === 0 ? "TUTORIAL COMPLETE" : "LEVEL COMPLETE"}</p><h2>{selected === 0 ? "You switched directions!" : `${history.length} moves.`}</h2>{selected !== 0 && <p>Optimal: {level.optimalMoves} moves.</p>}{mode === "levels" && nextUnlocked && <div className="so-result-actions"><button type="button" className="so-primary" onClick={() => choose(nextLevel?.number ?? selected)}>Next level →</button></div>}</div>}
  </section>;
}
