"use client";

import { useState } from "react";
import { useCachedApi } from "@/lib/client-cache";
import { formatScore } from "@/lib/format";
import type { Game, LeaderboardInsights } from "@/lib/types";

const lineColor = (index: number) => `hsl(${Math.round((index * 137.5 + 260) % 360)} 65% var(--chart-line-lightness))`;
const localDate = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
};
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const dateLabel = (date: string) => localDate(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });

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
      {[1, maxRank].filter((value, index, values) => values.indexOf(value) === index).map(rank => <g key={rank}><line x1="42" x2="592" y1={y(rank)} y2={y(rank)} stroke="var(--line)" /><text x="4" y={y(rank) + 4} fontSize="12">#{rank}</text></g>)}
      {active.map((series, index) => { const color = lineColor(index); return <g key={series.userId}><title>{series.displayName}: {series.points.filter(point => point.rank !== null).length} ranked days</title>{segments(series.points).map((segment, segmentIndex) => <polyline key={segmentIndex} points={segment} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />)}{series.points.map((point, day) => point.rank === null ? null : <circle key={point.date} cx={x(day)} cy={y(point.rank)} r="3.5" fill={color}><title>{series.displayName}, {dateLabel(point.date)}: rank {point.rank}</title></circle>)}</g>; })}
      <text x="42" y="225" fontSize="12">{dateLabel(data.from)}</text><text x="592" y="225" fontSize="12" textAnchor="end">{dateLabel(data.to)}</text>
    </svg></div>
    <div className="rank-legend">{active.map((series, index) => <span key={series.userId}><i style={{ background: lineColor(index) }} />{series.displayName}</span>)}</div>
    <p className="subtle">Each day shows placement among current members who played that game on that date. A gap means no result that day.</p>
  </div>;
}

export function rollingHeatmapDates(today = new Date()) {
  const first = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29, 12);
  return Array.from({ length: 30 }, (_, index) => {
    const day = new Date(first.getFullYear(), first.getMonth(), first.getDate() + index, 12);
    return { date: dateKey(day), weekday: (day.getDay() + 6) % 7 };
  });
}

function PerformanceHeatmap({ data, game }: { data: LeaderboardInsights; game: Game }) {
  const days = rollingHeatmapDates();
  const visibleDates = new Set(days.map(day => day.date));
  const scores = data.personalScores.filter(score => visibleDates.has(score.date));
  const ordered = [...scores].sort((a, b) => a.assistanceTier - b.assistanceTier || (game.rankingDirection === "lower" ? a.score - b.score : b.score - a.score));
  const middle = ordered.length ? ordered[Math.floor((ordered.length - 1) / 2)] : null;
  const byDate = new Map(scores.map(score => [score.date, score]));
  const performance = (score: (typeof scores)[number]) => {
    if (!middle) return "no-score";
    if (score.assistanceTier !== middle.assistanceTier) return score.assistanceTier < middle.assistanceTier ? "better" : "worse";
    const delta = game.rankingDirection === "lower" ? score.score - middle.score : middle.score - score.score;
    return delta < 0 ? "better" : delta > 0 ? "worse" : "typical";
  };
  const betterDays = scores.filter(score => performance(score) === "better").length;
  const firstWeekday = days[0].weekday;
  const alignedDays: ((typeof days)[number] | null)[] = [...Array<null>(firstWeekday).fill(null), ...days];
  while (alignedDays.length % 7) alignedDays.push(null);
  const weekCount = alignedDays.length / 7;
  const monthLabels = new Map<number, string>();
  days.forEach((day, index) => {
    if (index === 0 || day.date.slice(0, 7) !== days[index - 1].date.slice(0, 7)) {
      monthLabels.set(Math.floor((firstWeekday + index) / 7),
        localDate(day.date).toLocaleDateString(undefined, { month: "short" }));
    }
  });
  return <div className="heatmap-panel">
    <div className="heatmap-summary"><strong>{scores.length} of 30 days played</strong><span>{scores.length ? `${betterDays} ${betterDays === 1 ? "day" : "days"} above your median result` : "Add a result to start filling your calendar."}</span></div>
    <div className="heatmap-chart" role="group" aria-label={`Daily results from ${dateLabel(days[0].date)} to ${dateLabel(days[29].date)}`}>
      <div className="heatmap-month-labels" style={{ gridTemplateColumns: `repeat(${weekCount}, var(--heatmap-cell))` }} aria-hidden="true">
        {[...monthLabels].map(([column, label]) => <span key={column} style={{ gridColumn: column + 1 }}>{label}</span>)}
      </div>
      <div className="heatmap-body">
        <div className="heatmap-weekdays" aria-hidden="true">{["Mon", "", "Wed", "", "Fri", "", "Sun"].map((day, index) => <span key={index}>{day}</span>)}</div>
        <div className="heatmap-date-grid">{alignedDays.map((day, index) => {
          if (!day) return <span className="heatmap-pad" key={`pad-${index}`} aria-hidden="true" />;
          const score = byDate.get(day.date);
          const level = score ? performance(score) : "no-score";
          const label = `${localDate(day.date).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}: ${score ? `${formatScore(score.score, game.scoreFormat)}, ${level === "better" ? "above median" : level === "worse" ? "below median" : "median"}` : "no score"}`;
          return <span className={`heatmap-day ${level}`} key={day.date} title={label} aria-label={label} role="img" tabIndex={0} />;
        })}</div>
      </div>
    </div>
    <div className="heatmap-legend"><span><i className="heatmap-day no-score" />No score</span><span><i className="heatmap-day worse" />Below median</span><span><i className="heatmap-day typical" />Median</span><span><i className="heatmap-day better" />Above median</span></div>
    <p className="subtle">Colors compare results with your median over the last 30 days. Assistance is considered first.</p>
  </div>;
}
