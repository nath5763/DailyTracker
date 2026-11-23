"use client";

import { useMemo, useState } from "react";
import { AppLink } from "@/components/app-link";
import { useCachedApi } from "@/lib/client-cache";
import { formatNumber, formatNumericDisplay, formatResultDetails, formatScore, formatStoredScore } from "@/lib/format";
import type { Game, GameStats, SubmissionDetail, SubmissionHistory, SubmissionTrendPoint } from "@/lib/types";

const INITIAL_GAME_LIMIT = 8;

export type OverviewSelection = { gameSlug: string | null; page: number; submissionId: string | null };

export function nextOverviewSelection(state: OverviewSelection, gameSlug: string): OverviewSelection {
  if (state.gameSlug === gameSlug) return { ...state, gameSlug: null, submissionId: null };
  return { gameSlug, page: 0, submissionId: null };
}

export function orderGameStats(values: GameStats[]): GameStats[] {
  return [...values].sort((left, right) => {
    const date = (right.lastPlayedOn ?? "").localeCompare(left.lastPlayedOn ?? "");
    const submitted = (right.lastSubmittedAt ?? "").localeCompare(left.lastSubmittedAt ?? "");
    return date || submitted || left.game.name.localeCompare(right.game.name, undefined, { sensitivity: "base" });
  });
}

export function visibleGameStats(values: GameStats[], showAll: boolean): GameStats[] {
  const ordered = orderGameStats(values);
  return showAll ? ordered : ordered.slice(0, INITIAL_GAME_LIMIT);
}

export function OverviewGames({ values }: { values: GameStats[] }) {
  const [showAll, setShowAll] = useState(false);
  const [selection, setSelection] = useState<OverviewSelection>({ gameSlug: null, page: 0, submissionId: null });
  const ordered = useMemo(() => orderGameStats(values), [values]);
  const displayed = showAll ? ordered : ordered.slice(0, INITIAL_GAME_LIMIT);

  if (!ordered.length) return <section className="overview-empty empty">
    <strong>No games played yet</strong>
    <span>Add a daily result to start your personal dashboard.</span>
    <AppLink className="button button-small" href="/submit">Add your first score</AppLink>
  </section>;

  return <section aria-labelledby="my-games-heading">
    <div className="overview-section-heading">
      <h2 id="my-games-heading">Recently played</h2>
      <span>{ordered.length} game{ordered.length === 1 ? "" : "s"}</span>
    </div>
    <div className="overview-game-grid">
      {displayed.map(stats => {
        const open = selection.gameSlug === stats.game.slug;
        return <button className={`overview-game-card${open ? " open" : ""}`} type="button" key={stats.game.id}
          aria-expanded={open} aria-controls={open ? "overview-game-details" : undefined}
          onClick={() => setSelection(current => nextOverviewSelection(current, stats.game.slug))}>
          <span className="overview-card-heading"><strong>{stats.game.name}</strong><span aria-hidden="true">{open ? "−" : "+"}</span></span>
          <span className="overview-card-primary"><strong>{formatScore(stats.average, stats.game.scoreFormat)}</strong><small>All-time average</small></span>
          <span className="overview-card-metrics">
            <span><small>Personal best</small><strong>{formatScore(stats.best, stats.game.scoreFormat)}</strong></span>
            <span><small>Streak</small><strong>{stats.currentStreak} day{stats.currentStreak === 1 ? "" : "s"}</strong></span>
          </span>
          <span className="overview-card-footer">{stats.results} submission{stats.results === 1 ? "" : "s"}<span>{open ? "Hide details" : "View details"}</span></span>
        </button>;
      })}
    </div>
    {ordered.length > INITIAL_GAME_LIMIT ? <button className="text-button overview-show-all" type="button" onClick={() => setShowAll(value => !value)}>
      {showAll ? "Show recent games" : `Show all my games (${ordered.length})`}
    </button> : null}
    {selection.gameSlug ? <GameDetails gameSlug={selection.gameSlug} page={selection.page}
      selectedSubmissionId={selection.submissionId}
      onPageChange={page => setSelection(current => ({ ...current, page, submissionId: null }))}
      onSubmissionChange={submissionId => setSelection(current => ({ ...current, submissionId }))} /> : null}
  </section>;
}

export function GameDetails({ gameSlug, page, selectedSubmissionId, onPageChange, onSubmissionChange }: {
  gameSlug: string;
  page: number;
  selectedSubmissionId: string | null;
  onPageChange: (page: number) => void;
  onSubmissionChange: (id: string | null) => void;
}) {
  const path = `/dashboard/games/${encodeURIComponent(gameSlug)}/submissions?page=${page}&size=10`;
  const { data, loading, error, refresh } = useCachedApi<SubmissionHistory>(path, { storage: "memory" });

  return <section className="overview-game-details" id="overview-game-details" aria-live="polite">
    {loading ? <div className="overview-detail-state">Loading game history…</div> : null}
    {!loading && error ? <div className="overview-detail-state form-message error">{error}<button className="text-button" type="button" onClick={() => void refresh()}>Try again</button></div> : null}
    {data ? <>
      <div className="overview-detail-heading"><div><p className="section-number">GAME DETAILS</p><h2>{data.game.name}</h2></div><span>{data.totalSubmissions} total submission{data.totalSubmissions === 1 ? "" : "s"}</span></div>
      <PerformanceTrend game={data.game} points={data.trend} />
      <div className="submission-history-heading"><h3>Submission history</h3><span>Newest first</span></div>
      {data.submissions.length ? <div className="submission-history-list">{data.submissions.map(submission => {
        const open = selectedSubmissionId === submission.id;
        return <div className="submission-history-item" key={submission.id}>
          <button type="button" aria-expanded={open} onClick={() => onSubmissionChange(open ? null : submission.id)}>
            <span className="submission-history-date"><strong>{formatPlayedOn(submission.playedOn)}</strong><small>{data.game.submission.puzzleLabel} {submission.puzzleKey}{submission.submissionMethod === "MANUAL" ? " · Manual · unverified" : ""}</small>{submission.details.length ? <small className="submission-history-details">{formatResultDetails(submission.details)}</small> : null}</span>
            <strong className="submission-history-score">{formatStoredScore(submission, data.game)}</strong>
            <span className="submission-expand-mark" aria-hidden="true">{open ? "−" : "+"}</span>
          </button>
          {open ? <SubmissionDetails id={submission.id} onClose={() => onSubmissionChange(null)} /> : null}
        </div>;
      })}</div> : <div className="empty">No submission history is available for this game.</div>}
      {data.totalPages > 1 ? <nav className="history-pagination" aria-label={`${data.game.name} submission history pages`}>
        <button className="button button-small button-ghost" type="button" disabled={data.page === 0} onClick={() => onPageChange(data.page - 1)}>Previous</button>
        <span>Page {data.page + 1} of {data.totalPages}</span>
        <button className="button button-small button-ghost" type="button" disabled={data.page + 1 >= data.totalPages} onClick={() => onPageChange(data.page + 1)}>Next</button>
      </nav> : null}
    </> : null}
  </section>;
}

export function SubmissionDetails({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, loading, error, refresh } = useCachedApi<SubmissionDetail>(`/dashboard/submissions/${encodeURIComponent(id)}`, { storage: "memory" });
  if (loading) return <div className="submission-detail-state">Loading saved result…</div>;
  if (error) return <div className="submission-detail-state form-message error">{error}<button className="text-button" type="button" onClick={() => void refresh()}>Try again</button></div>;
  if (!data) return null;
  const metadata = Object.entries(data.metrics ?? {}).filter(([, value]) => value !== null && value !== undefined);
  return <section className="submission-detail" aria-label={`${data.game.name} submission details`}>
    <div className="submission-detail-heading"><h4>Saved result</h4><button className="text-button" type="button" onClick={onClose}>Close</button></div>
    <dl className="submission-detail-grid">
      <div><dt>Game</dt><dd>{data.game.name}</dd></div>
      <div><dt>Played</dt><dd>{formatPlayedOn(data.playedOn)}</dd></div>
      <div><dt>Submitted</dt><dd>{formatSubmittedAt(data.submittedAt)}</dd></div>
      <div><dt>Formatted score</dt><dd>{formatStoredScore(data, data.game)}</dd></div>
      <div><dt>Raw score</dt><dd>{formatNumber(data.primaryScore)}</dd></div>
      <div><dt>Submission ID</dt><dd className="monospace">{data.id}</dd></div>
    </dl>
    {data.details.length ? <div className="submission-breakdown"><h5>Result breakdown</h5><dl>{data.details.map(detail => <div key={`${detail.label}-${detail.value}`}><dt>{detail.label}</dt><dd>{formatNumericDisplay(detail.value)}</dd></div>)}</dl></div> : null}
    {metadata.length ? <details className="submission-metadata"><summary>All saved metadata</summary><dl>{metadata.map(([key, value]) => <div key={key}><dt>{humanizeKey(key)}</dt><dd>{formatMetadataValue(value)}</dd></div>)}</dl></details> : null}
    {data.rawText ? <div className="submission-share-text"><h5>Original share text</h5><pre>{data.rawText}</pre></div> : null}
  </section>;
}

export function trendBars(points: SubmissionTrendPoint[], direction: Game["rankingDirection"]) {
  const numeric = points.filter(point => Number.isFinite(point.primaryScore)).slice().reverse();
  if (numeric.length < 2) return [];
  const scores = numeric.map(point => point.primaryScore);
  const minimum = Math.min(...scores);
  const maximum = Math.max(...scores);
  return numeric.map(point => {
    const normalized = maximum === minimum ? 0.5 : (point.primaryScore - minimum) / (maximum - minimum);
    const performance = direction === "higher" ? normalized : 1 - normalized;
    return { ...point, height: 24 + performance * 76 };
  });
}

function PerformanceTrend({ game, points }: { game: Game; points: SubmissionTrendPoint[] }) {
  const bars = trendBars(points, game.rankingDirection);
  return <section className="performance-trend" aria-labelledby="performance-trend-heading">
    <div><h3 id="performance-trend-heading">Recent performance</h3><span>{game.rankingDirection === "lower" ? "Lower is better" : "Higher is better"}</span></div>
    {!bars.length ? <p className="subtle">Add at least two numeric results to see a trend.</p> : <div className="performance-bars" role="img" aria-label={`${game.name} recent scores, oldest to newest`}>
      {bars.map(point => <span key={point.id} style={{ height: `${point.height}%` }} title={`${formatPlayedOn(point.playedOn)}: ${formatStoredScore(point, game)}`}><i /></span>)}
    </div>}
    {bars.length ? <p className="trend-note">Each mark is one result; discrete scores are shown separately and are not connected.</p> : null}
  </section>;
}

export function formatPlayedOn(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}T00:00:00Z`));
}

function formatSubmittedAt(value: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function humanizeKey(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/^./, first => first.toUpperCase());
}

function formatMetadataValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return formatNumber(value);
  if (typeof value === "string") return value;
  return formatMetadataJson(value);
}

function formatMetadataJson(value: unknown): string {
  if (typeof value === "number") return formatNumber(value);
  if (Array.isArray(value)) return `[${value.map(formatMetadataJson).join(", ")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value)
    .map(([key, item]) => `${JSON.stringify(key)}: ${formatMetadataJson(item)}`).join(", ")}}`;
  return JSON.stringify(value) ?? String(value);
}
