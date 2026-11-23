"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatBloomTime } from "@/lib/bloom-and-boom/format";
import { invalidateDashboardCache } from "@/lib/client-cache";

type Position = { row: number; column: number };
type Cell = Position & { kind: "SAFE" | "HAZARD" };
type AttemptStatus = "READY" | "PLAYING" | "WON" | "LOST";
type DailyPuzzle = {
  puzzleId: string;
  puzzleDate: string;
  size: number;
  rowHazards: number[];
  columnHazards: number[];
  status: AttemptStatus;
  startedAt: string | null;
  endedAt: string | null;
  elapsedMs: number | null;
  revealed: Cell[];
  finalBoard: Cell[] | null;
};

async function request(path = "", method = "GET", body?: unknown): Promise<DailyPuzzle> {
  const response = await fetch(`/api/v1/bloom-and-boom/today${path}`, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.message || value.error || "The garden could not be reached.");
  return value as DailyPuzzle;
}

function cellKey(row: number, column: number) { return `${row}:${column}`; }
export function BloomAndBoomGame({ signedIn, userId }: { signedIn: boolean; userId?: string | null }) {
  const [puzzle, setPuzzle] = useState<DailyPuzzle | null>(null);
  const [flags, setFlags] = useState<Set<string>>(new Set());
  const [flagMode, setFlagMode] = useState(false);
  const [now, setNow] = useState(0);
  const [busyCell, setBusyCell] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let live = true;
    request().then(value => {
      if (!live) return;
      setPuzzle(value);
      try {
        const stored = JSON.parse(localStorage.getItem(`bloom-and-boom:flags:${value.puzzleId}`) || "[]");
        if (Array.isArray(stored)) setFlags(new Set(stored.filter(item => typeof item === "string")));
      } catch { setFlags(new Set()); }
    })
      .catch(error => { if (live) setMessage(error instanceof Error ? error.message : "The garden could not be reached."); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (puzzle?.status !== "PLAYING") return;
    const timer = window.setInterval(() => setNow(Date.now()), 47);
    return () => window.clearInterval(timer);
  }, [puzzle?.status]);

  const saveFlags = useCallback((next: Set<string>) => {
    setFlags(next);
    if (puzzle) localStorage.setItem(`bloom-and-boom:flags:${puzzle.puzzleId}`, JSON.stringify([...next]));
  }, [puzzle]);

  const visible = useMemo(() => new Map((puzzle?.finalBoard || puzzle?.revealed || [])
    .map(cell => [cellKey(cell.row, cell.column), cell])), [puzzle]);
  const elapsed = puzzle?.elapsedMs ?? (puzzle?.status === "PLAYING" && puzzle.startedAt
    ? Math.max(0, now - new Date(puzzle.startedAt).getTime()) : 0);

  async function start() {
    if (!puzzle || puzzle.status !== "READY" || busyCell) return;
    setBusyCell("start"); setMessage("");
    try { setPuzzle(await request("/start", "POST")); setNow(Date.now()); }
    catch (error) { setMessage(error instanceof Error ? error.message : "The puzzle could not start."); }
    finally { setBusyCell(null); }
  }

  function toggleFlag(row: number, column: number) {
    if (puzzle?.status !== "PLAYING" || visible.has(cellKey(row, column))) return;
    const next = new Set(flags), key = cellKey(row, column);
    if (next.has(key)) next.delete(key); else next.add(key);
    saveFlags(next);
  }

  async function choose(row: number, column: number) {
    if (!puzzle || puzzle.status !== "PLAYING") return;
    const key = cellKey(row, column);
    if (busyCell || visible.has(key)) return;
    if (flagMode || flags.has(key)) { toggleFlag(row, column); return; }
    setBusyCell(key); setMessage("");
    try {
      const next = await request("/reveal", "POST", { row, column });
      setPuzzle(next);
      if (next.status === "WON" || next.status === "LOST") invalidateDashboardCache(userId);
      setNow(Date.now());
    }
    catch (error) { setMessage(error instanceof Error ? error.message : "That tile could not be turned."); }
    finally { setBusyCell(null); }
  }

  if (!puzzle) return <section className="bb-page shell"><p role="status">{message || "Planting today’s garden…"}</p></section>;
  const safeCount = puzzle.revealed.filter(cell => cell.kind === "SAFE").length;
  const totalHazards = puzzle.rowHazards.reduce((sum, value) => sum + value, 0);
  const totalSafe = puzzle.size * puzzle.size - totalHazards;
  const ended = puzzle.status === "WON" || puzzle.status === "LOST";

  return <section className="bb-page shell">
    <header className="bb-hero">
      <div className="bb-hero-copy"><p className="bb-kicker">DAILY GARDEN · {puzzle.puzzleDate}</p><h1>Bloom <em>&</em> Boom</h1>
        <p>Turn every safe seed packet without waking a storm-bug. The clues tell you how many are hiding in each row and column.</p>
        <div className="bb-motif-strip" aria-hidden="true"><span>✿ Bloom</span><i>◆</i><span>☁ Boom</span><i>◆</i><span>⚑ Mark</span></div></div>
    </header>

    <div className="bb-game-layout">
      <div className="bb-play-area">
        <div className="bb-status-bar">
          <div><span>TIME</span><strong className="bb-time">{formatBloomTime(elapsed)}</strong></div>
          <div><span>FOUND</span><strong>{safeCount} / {totalSafe}</strong></div>
          <div><span>GARDEN</span><strong>{puzzle.size} × {puzzle.size}</strong></div>
        </div>

        <div className="bb-board-wrap">
          <div className="bb-board" style={{ "--bb-size": puzzle.size } as React.CSSProperties}
            aria-label={`${puzzle.size} by ${puzzle.size} Bloom and Boom board`}>
            {Array.from({ length: puzzle.size * puzzle.size }, (_, index) => {
              const row = Math.floor(index / puzzle.size), column = index % puzzle.size;
              const key = cellKey(row, column), cell = visible.get(key), flagged = flags.has(key) && !cell;
              return <button type="button" key={key} className={`bb-tile ${cell ? `bb-${cell.kind.toLowerCase()}` : ""} ${flagged ? "bb-flagged" : ""}`}
                style={{ gridRow: row + 1, gridColumn: column + 1 }} disabled={puzzle.status !== "PLAYING" || !!cell || busyCell === key}
                aria-label={`Row ${row + 1}, column ${column + 1}: ${cell?.kind === "SAFE" ? "safe flower" : cell?.kind === "HAZARD" ? "storm-bug" : flagged ? "flagged hidden tile" : "hidden tile"}`}
                aria-pressed={flagged} onContextMenu={event => { event.preventDefault(); toggleFlag(row, column); }}
                onClick={() => void choose(row, column)}><span aria-hidden="true">{cell?.kind === "SAFE" ? "✿" : cell?.kind === "HAZARD" ? "☁" : flagged ? "⚑" : ""}</span></button>;
            })}
            {puzzle.rowHazards.map((count, row) => <div key={`r${row}`} className="bb-clue bb-row-clue" style={{ gridRow: row + 1, gridColumn: puzzle.size + 1 }} aria-label={`Row ${row + 1} has ${count} storm-bugs`}><strong>{count}</strong><span>bugs</span></div>)}
            {puzzle.columnHazards.map((count, column) => <div key={`c${column}`} className="bb-clue bb-column-clue" style={{ gridRow: puzzle.size + 1, gridColumn: column + 1 }} aria-label={`Column ${column + 1} has ${count} storm-bugs`}><strong>{count}</strong><span>bugs</span></div>)}
            <div className="bb-clue bb-corner" style={{ gridRow: puzzle.size + 1, gridColumn: puzzle.size + 1 }} aria-hidden="true">☂</div>
          </div>
        </div>

        <div className="bb-controls">
          {puzzle.status === "READY" && <button type="button" className="bb-primary" disabled={!!busyCell} onClick={() => void start()}>Start today’s puzzle</button>}
          {puzzle.status === "PLAYING" && <button type="button" className={`bb-flag-toggle ${flagMode ? "active" : ""}`} aria-pressed={flagMode} onClick={() => setFlagMode(value => !value)}>{flagMode ? "Flag mode on" : "Flag mode off"}</button>}
          <p className="bb-message" role="status">{message || (puzzle.status === "PLAYING" ? "Tap to reveal · right-click or use flag mode to mark a storm-bug" : "")}</p>
        </div>

        {ended && <div className={`bb-result bb-result-${puzzle.status.toLowerCase()}`} role="status">
          <p className="bb-kicker">{puzzle.status === "WON" ? "GARDEN COMPLETE" : "STORM-BUG AWAKENED"}</p>
          <h2>{puzzle.status === "WON" ? `You bloomed in ${formatBloomTime(elapsed)}.` : "That’s all for today."}</h2>
          <p>{puzzle.status === "WON" ? signedIn ? "Your time is saved for your Daily Club leaderboards." : "This guest result is saved on this device." : "The whole garden is revealed below. A new puzzle grows at midnight UTC."}</p>
          {signedIn && <Link className="bb-secondary" href="/leaderboards">View leaderboards</Link>}
        </div>}
      </div>

      <aside className="bb-guide">
        <p className="bb-kicker">HOW TO PLAY</p><h2>Count the clouds. Find the flowers.</h2>
        <ol><li>Each clue is the number of storm-bugs hidden in that row or column.</li><li>Use both directions to decide which packets are safe.</li><li>Reveal every flower to finish. One storm-bug ends today’s attempt.</li></ol>
        <div className="bb-legend"><span><i className="bb-legend-flower">✿</i> Safe bloom</span><span><i className="bb-legend-bug">☁</i> Storm-bug</span><span><i>⚑</i> Your flag</span></div>
        <p className="bb-fairness">Every row and column contains both flowers and storm-bugs. Use overlapping clues to narrow your choices; some gardens require a carefully weighed chance.</p>
        {!signedIn && <p className="bb-guest-note">Guest attempts are tied to this browser. Clearing browser data can reset that local identity.</p>}
      </aside>
    </div>
  </section>;
}
