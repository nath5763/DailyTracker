"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createVariantRound, finishVariant, startVariant, submitVariant, variantTimeLeft, type VariantMode, type VariantRound } from "@/lib/letter-bag/variants";

const settings = {
  untimed: {
    title: "Letter Bag: Take Your Time",
    summary: "30 letters · no timer",
    instructions: "Use the 30 letters in the rack and bag to make as many words as you can. There is no clock. Used tiles refill from the bag until all 30 have been used.",
  },
  endless: {
    title: "Letter Bag: Endless Draw",
    summary: "90 seconds · unlimited tiles",
    instructions: "Make as many words as you can in 90 seconds. Each accepted word draws replacement tiles, and new tiles keep coming even after the first 30 are used.",
  },
} as const;

function newRound(mode: VariantMode) {
  return createVariantRound(mode, crypto.randomUUID());
}

function loadRound(mode: VariantMode): VariantRound {
  try {
    const saved = JSON.parse(localStorage.getItem(`letter-bag:${mode}:v1`) || "null");
    if (saved?.mode === mode && typeof saved.seed === "string" &&
      Array.isArray(saved.rack) && Array.isArray(saved.bag) && Array.isArray(saved.words) &&
      typeof saved.nextId === "number" && typeof saved.score === "number") return saved;
  } catch { /* Start a fresh local round if browser storage is unavailable. */ }
  return newRound(mode);
}

export function LetterBagVariant({ mode }: { mode: VariantMode }) {
  const [round, setRound] = useState<VariantRound | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [help, setHelp] = useState(false);
  const [now, setNow] = useState(0);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const current = Date.now();
      const loaded = loadRound(mode);
      setNow(current);
      setRound(loaded.mode === "endless" && loaded.startedAt !== null && variantTimeLeft(loaded, current) === 0
        ? finishVariant(loaded, current) : loaded);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [mode]);
  useEffect(() => {
    if (!round) return;
    try { localStorage.setItem(`letter-bag:${mode}:v1`, JSON.stringify(round)); } catch { /* Play still works without storage. */ }
  }, [mode, round]);
  useEffect(() => {
    if (mode !== "endless" || round?.startedAt == null || round.endedAt !== null) return;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      setRound(previous => previous && variantTimeLeft(previous, current) === 0
        ? finishVariant(previous, current) : previous);
    }, 250);
    return () => window.clearInterval(timer);
  }, [mode, round?.startedAt, round?.endedAt]);
  useEffect(() => {
    if (!help) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setHelp(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [help]);

  if (!round) return <section className="shell letter-bag"><h1>{settings[mode].title}</h1><p role="status">Loading your bag…</p></section>;
  const started = round.startedAt !== null;
  const timeLeft = variantTimeLeft(round, now);
  const ended = round.endedAt !== null || timeLeft === 0;
  const active = started && !ended;
  const chosen = selected.map(id => round.rack.find(tile => tile.id === id)).filter(tile => tile !== undefined);
  const longest = Math.max(0, ...round.words.map(word => word.word.length));
  const visibleRack = started ? round.rack : round.rack.map(tile => ({ ...tile, letter: "?" }));
  const preview = round.bag.slice(0, 5).map(tile => started ? tile : { ...tile, letter: "?" });
  const share = `${settings[mode].title}\nScore: ${round.score}\nWords: ${round.words.length}\nLongest word: ${longest} letters\nPractice round`;

  function playWord() {
    const result = submitVariant(round!, selected);
    setRound(result.round);
    setMessage(result.error || "");
    if (!result.error) setSelected([]);
  }
  function freshBag() {
    setRound(newRound(mode));
    setSelected([]);
    setMessage("");
  }

  return <section className="shell letter-bag">
    <div className="lb-top"><div><p className="section-number">LETTER BAG PRACTICE</p><h1>{settings[mode].title}</h1><p>Browser-local round · {settings[mode].summary}</p></div><button type="button" className="secondary-link" onClick={() => setHelp(true)}>How to play</button></div>
    <div className="lb-stats"><div><span>SCORE</span><strong>{round.score}</strong></div><div><span>TIME</span><strong>{timeLeft === null ? "∞" : `${timeLeft}s`}</strong></div><div><span>{mode === "untimed" ? "BAG" : "DRAW"}</span><strong>{mode === "untimed" ? round.bag.length : "∞"}</strong></div></div>
    {timeLeft !== null && <div className="lb-timer" aria-hidden="true"><span style={{ width: `${timeLeft / 90 * 100}%` }} /></div>}
    {ended ? <div className="lb-result"><p className="section-number">PRACTICE RESULT</p><h2>{round.score} points</h2><p>{round.words.length} words · longest {longest} letters</p><div className="lb-actions"><button className="button" type="button" onClick={() => navigator.clipboard.writeText(share).then(() => setMessage("Result copied.")).catch(() => setMessage("Could not copy result."))}>Copy result</button><button type="button" onClick={freshBag}>Play again</button></div>{round.words.length > 0 && <div className="lb-history"><h3>Words played</h3>{[...round.words].reverse().map((word, index) => <div key={index}>{word.word}<b>+{word.points}</b></div>)}</div>}</div> : <div className="lb-board">
      <div className="lb-bag"><Image src="/letter-bag/letter-bag.webp" width={500} height={300} alt="" /><span>{settings[mode].summary.toUpperCase()}</span></div>
      {active && <div className="lb-compose"><span>YOUR WORD</span><div className="lb-chosen">{chosen.length ? chosen.map(tile => <button key={tile.id} type="button" onClick={() => setSelected(current => current.filter(id => id !== tile.id))} aria-label={`Remove ${tile.letter} from word`}>{tile.letter}</button>) : <span>Tap letters to form a word</span>}</div><button type="button" onClick={() => setSelected(current => current.slice(0, -1))} disabled={!selected.length}>← Back</button></div>}
      <h2>Your letters</h2><div className="lb-rack">{visibleRack.map(tile => <button key={tile.id} type="button" disabled={!active || selected.includes(tile.id)} className={started ? "" : "masked"} onClick={() => setSelected(current => [...current, tile.id])} aria-label={started ? `Letter ${tile.letter}` : "Hidden letter"}>{tile.letter}</button>)}</div>
      <h2>Up next</h2><div className="lb-preview">{preview.map(tile => <span key={tile.id}>{tile.letter}</span>)}</div>
      <div className="lb-actions">{!started ? <><button className="button" type="button" onClick={() => { setRound(startVariant(round)); setNow(Date.now()); }}>Start</button><button type="button" onClick={freshBag}>New bag</button></> : <><button className="button" type="button" disabled={selected.length < 3} onClick={playWord}>Play word</button><button type="button" disabled={!selected.length} onClick={() => setSelected([])}>Clear</button><button type="button" onClick={() => setRound(finishVariant(round))}>Finish early</button></>}</div>
    </div>}
    <p className="lb-feedback" role="status">{message}</p>
    {help && <div className="lb-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setHelp(false); }}><div role="dialog" aria-modal="true" aria-labelledby="lb-help-title" className="lb-dialog"><button autoFocus type="button" onClick={() => setHelp(false)} aria-label="Close instructions">×</button><h2 id="lb-help-title">How to play</h2><p>{settings[mode].instructions}</p><p>Tap at least three letters, then Play word. A word scores 1 point plus 1, 2, 3 and so on for each letter. Repeated or invalid words do not use tiles. This practice round is saved only in this browser.</p></div></div>}
  </section>;
}
