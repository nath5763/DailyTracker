"use client";

import { useState } from "react";
import { useCachedApi } from "@/lib/client-cache";
import { formatScore } from "@/lib/format";
import type { Game, LeaderboardInsights } from "@/lib/types";

const lineColor = (index: number) => `hsl(${Math.round((index * 137.5 + 260) % 360)} 65% 36%)`;
const dateLabel = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });

export function LeaderboardInsightsView({ boardId, game }: { boardId: string; game: Game }) {
  const [view, setView] = useState<"line" | "heatmap">("line");
  const path = `/leaderboards/${encodeURIComponent(boardId)}/insights?game=${encodeURIComponent(game.slug)}`;
  const { data, error, refresh } = useCachedApi<LeaderboardInsights>(path, { storage: "memory" });
  return <div className="insights-panel">
    <div className="insights-heading"><div><p className="section-number">LAST 30 DAYS</p><h2>Progress</h2></div><div className="tabs" role="group" aria-label="Progress view"><button className={`tab ${view === "line" ? "active" : ""}`} type="button" aria-pressed={view === "line"} onClick={() => setView("line")}>Rank progression</button><button className={`tab ${view === "heatmap" ? "active" : ""}`} type="button" aria-pressed={view === "heatmap"} onClick={() => setView("heatmap")}>My heatmap</button></div></div>
    {!data ? <div className="empty">{error || "Loading progress…"}{error ? <button className="text-button" type="button" onClick={() => void refresh()}>Retry</button> : null}</div> : view === "line" ? <RankGraph data={data} /> : <PerformanceHeatmap data={data} game={game} />}
  </div>;
}

function RankGraph({ data }: { data: LeaderboardInsights }) {
  const active = data.ranks.filter(series => series.points.some(point => point.rank !== null));
  if (!active.length) return <div className="empty">No ranks to chart yet. Scores will appear here as members play.</div>;
  const maxRank = Math.max(data.ranks.length, 1);
  const x = (index: number) => 42 + index * (550 / 29);
  const y = (rank: number) => 25 + (maxRank === 1 ? 0 : (rank - 1) * (170 / (maxRank - 1)));
  const segments = (points: { rank: number | null }[]) => {
    const groups: string[] = [];
    let current: string[] = [];
    points.forEach((point, index) => {
      if (point.rank === null) { if (current.length) groups.push(current.join(" ")); current = []; }
      else current.push(`${x(index)},${y(point.rank)}`);
    });
    if (current.length) groups.push(current.join(" "));
    return groups;
  };
  return <div>
    <div className="rank-chart-scroll"><svg viewBox="0 0 620 235" role="img" aria-label={`Rank progression from ${dateLabel(data.from)} to ${dateLabel(data.to)}; rank one is best`}>
      {[1, maxRank].filter((value, index, values) => values.indexOf(value) === index).map(rank => <g key={rank}><line x1="42" x2="592" y1={y(rank)} y2={y(rank)} stroke="#d6d1c6" /><text x="4" y={y(rank) + 4} fontSize="12">#{rank}</text></g>)}
      {active.map((series, index) => { const color = lineColor(index); return <g key={series.userId}><title>{series.displayName}: {series.points.filter(point => point.rank !== null).length} ranked days</title>{segments(series.points).map((segment, segmentIndex) => <polyline key={segmentIndex} points={segment} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />)}{series.points.map((point, day) => point.rank === null ? null : <circle key={point.date} cx={x(day)} cy={y(point.rank)} r="3.5" fill={color}><title>{series.displayName}, {dateLabel(point.date)}: rank {point.rank}</title></circle>)}</g>; })}
      <text x="42" y="225" fontSize="12">{dateLabel(data.from)}</text><text x="592" y="225" fontSize="12" textAnchor="end">{dateLabel(data.to)}</text>
    </svg></div>
    <div className="rank-legend">{active.map((series, index) => <span key={series.userId}><i style={{ background: lineColor(index) }} />{series.displayName}</span>)}</div>
    <p className="subtle">Each day shows the standing among current members using scores from the preceding 30 days. A gap means no score in that window.</p>
  </div>;
}

export function calendarMonths(from: string, to: string) {
  const months: { key: string; label: string; days: (string | null)[] }[] = [];
  const cursor = new Date(`${from.slice(0, 7)}-01T12:00:00Z`);
  while (cursor.toISOString().slice(0, 7) <= to.slice(0, 7)) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const key = cursor.toISOString().slice(0, 7);
    const offset = (cursor.getUTCDay() + 6) % 7;
    const days: (string | null)[] = Array(offset).fill(null);
    const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    for (let day = 1; day <= count; day++) days.push(`${key}-${String(day).padStart(2, "0")}`);
    while (days.length % 7) days.push(null);
    months.push({ key, label: cursor.toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" }), days });
    cursor.setUTCMonth(month + 1);
  }
  return months;
}

function PerformanceHeatmap({ data, game }: { data: LeaderboardInsights; game: Game }) {
  const scores = data.personalScores;
  const ordered = [...scores].sort((a, b) => a.assistanceTier - b.assistanceTier || (game.rankingDirection === "lower" ? a.score - b.score : b.score - a.score));
  const middle = ordered.length ? ordered[Math.floor((ordered.length - 1) / 2)] : null;
  const byDate = new Map(scores.map(score => [score.date, score]));
  const performance = (score: (typeof scores)[number]) => {
    if (!middle) return "empty";
    if (score.assistanceTier !== middle.assistanceTier) return score.assistanceTier < middle.assistanceTier ? "better" : "worse";
    const delta = game.rankingDirection === "lower" ? score.score - middle.score : middle.score - score.score;
    return delta < 0 ? "better" : delta > 0 ? "worse" : "typical";
  };
  const betterDays = scores.filter(score => performance(score) === "better").length;
  return <div className="heatmap-panel">
    <div className="heatmap-summary"><strong>{scores.length} of 30 days played</strong><span>{scores.length ? `${betterDays} ${betterDays === 1 ? "day" : "days"} above your median result` : "Add a result to start filling your calendar."}</span></div>
    <div className="heatmap-calendars" role="group" aria-label={`Daily results from ${dateLabel(data.from)} to ${dateLabel(data.to)}`}>
      {calendarMonths(data.from, data.to).map(month => <section className="heatmap-month" key={month.key} aria-label={month.label}>
        <h3>{month.label}</h3>
        <div className="heatmap-weekday-row" aria-hidden="true">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => <span key={day}>{day}</span>)}</div>
        <div className="heatmap-date-grid">{month.days.map((date, index) => {
          if (!date) return <span className="heatmap-day-placeholder" key={`pad-${index}`} aria-hidden="true" />;
          const inRange = date >= data.from && date <= data.to;
          const score = inRange ? byDate.get(date) : undefined;
          const level = !inRange ? "outside" : score ? performance(score) : "empty";
          const label = !inRange ? `${dateLabel(date)}: outside the last 30 days` : score
            ? `${dateLabel(date)}: ${formatScore(score.score, game.scoreFormat)}, ${level}` : `${dateLabel(date)}: no score`;
          return <span className={`heatmap-day ${level}`} key={date} title={label} aria-label={label} tabIndex={score ? 0 : undefined}>{Number(date.slice(-2))}</span>;
        })}</div>
      </section>)}
    </div>
    <div className="heatmap-legend"><span><i className="heatmap-day empty" />No score</span><span><i className="heatmap-day worse" />Below median</span><span><i className="heatmap-day typical" />Median</span><span><i className="heatmap-day better" />Above median</span></div>
    <p className="subtle">Colors compare results with your median over the last 30 days. Assistance is considered first.</p>
  </div>;
}
