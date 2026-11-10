"use client";

import { useEffect, useRef, useState } from "react";
import { ShareableLeaderboardCard } from "@/components/shareable-leaderboard-card";
import { leaderboardMemberScoresCachePath } from "@/lib/client-cache";
import type { Leaderboard, LeaderboardMemberScores } from "@/lib/types";
import { copyPngOrDownload } from "@/lib/share-image";

export function ShareLeaderboardModal({ board, onClose }: { board: Leaderboard; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [resultsByPlayer, setResultsByPlayer] = useState<Record<string, LeaderboardMemberScores>>({});
  const [resultsLoading, setResultsLoading] = useState(board.rankings.length > 0);
  const [resultsError, setResultsError] = useState("");
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
    const preview = previewRef.current;
    if (!preview) return;
    const resize = () => setScale(Math.min(Math.max(preview.clientWidth, 1) / 1200, 1));
    resize();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", resize);
      return () => window.removeEventListener("resize", resize);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(preview);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const topPlayers = board.rankings.slice(0, 3);
    if (!topPlayers.length) return;
    const controller = new AbortController();
    Promise.all(topPlayers.map(async (player) => {
      const path = leaderboardMemberScoresCachePath(board.id, player.userId, board.game.slug, board.range);
      const response = await fetch(`/api/v1${path}`, { cache: "no-store", credentials: "same-origin", signal: controller.signal });
      if (!response.ok) throw new Error("Could not load the game results.");
      return [player.userId, await response.json() as LeaderboardMemberScores] as const;
    })).then((entries) => {
      setResultsByPlayer(Object.fromEntries(entries));
      setResultsError("");
    }).catch(() => {
      if (!controller.signal.aborted) setResultsError("Could not load the game results. Retry before sharing.");
    }).finally(() => { if (!controller.signal.aborted) setResultsLoading(false); });
    return () => controller.abort();
  }, [board, retry]);

  async function generate(): Promise<Blob> {
    if (!cardRef.current) throw new Error("The card is not ready yet.");
    const { toBlob } = await import("html-to-image");
    const blob = await toBlob(cardRef.current, { width: 1200, height: 630, pixelRatio: 1,
      backgroundColor: "#191a23", cacheBust: true });
    if (!blob) throw new Error("The image could not be generated.");
    return blob;
  }

  function download(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dailytracker-results-${board.game.slug}-${board.range}.png`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function exportImage(action: "copy" | "download") {
    setBusy(true); setError(""); setMessage("");
    try {
      const blob = await generate();
      if (action === "download") {
        download(blob); setMessage("PNG downloaded.");
      } else {
        const outcome = await copyPngOrDownload(blob, download);
        setMessage(outcome === "copied" ? "Image copied to clipboard." :
          "Image copying was unavailable, so the PNG was downloaded instead.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not generate the image. Try again.");
    } finally { setBusy(false); }
  }

  return <dialog ref={dialogRef} className="share-dialog" onClose={onClose} aria-labelledby="share-dialog-title">
    <div className="share-dialog-header"><div><p className="section-number">SHARE RESULTS</p><h2 id="share-dialog-title">Preview your card</h2></div><button className="text-button" type="button" onClick={() => dialogRef.current?.close()} aria-label="Close share card">Close</button></div>
    <div className="share-card-preview" ref={previewRef}><div className="share-card-scale" style={{ transform: `scale(${scale})` }}><ShareableLeaderboardCard board={board} resultsByPlayer={resultsByPlayer} ref={cardRef} /></div></div>
    {resultsLoading ? <p role="status">Loading game results…</p> : null}
    {resultsError ? <p className="form-message error" role="alert">{resultsError} <button className="text-button" type="button" onClick={() => { setResultsLoading(true); setResultsError(""); setRetry(value => value + 1); }}>Retry</button></p> : null}
    {error ? <p className="form-message error" role="alert">{error}</p> : null}
    {message ? <p className="form-message success" role="status">{message}</p> : null}
    <div className="share-dialog-actions"><button className="button" type="button" disabled={busy || resultsLoading || Boolean(resultsError)} onClick={() => void exportImage("download")}>{busy ? "Generating image…" : "Download as PNG"}</button><button className="button button-ghost" type="button" disabled={busy || resultsLoading || Boolean(resultsError)} onClick={() => void exportImage("copy")}>Copy image to clipboard</button></div>
  </dialog>;
}
