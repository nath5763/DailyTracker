"use client";

import { useState } from "react";
import { AppLink } from "@/components/app-link";
import type { DashboardBoardSummary } from "@/lib/types";

const INITIAL_LEADERBOARD_LIMIT = 6;

export function ordinal(value: number): string {
  const tens = value % 100;
  if (tens >= 11 && tens <= 13) return `${value}th`;
  return `${value}${value % 10 === 1 ? "st" : value % 10 === 2 ? "nd" : value % 10 === 3 ? "rd" : "th"}`;
}

export function visibleLeaderboards(values: DashboardBoardSummary[], showAll: boolean) {
  return showAll ? values : values.slice(0, INITIAL_LEADERBOARD_LIMIT);
}

export function OverviewLeaderboards({ values }: { values: DashboardBoardSummary[] }) {
  const [showAll, setShowAll] = useState(false);
  const displayed = visibleLeaderboards(values, showAll);
  return <section className="overview-leaderboards" aria-labelledby="overview-leaderboards-heading">
    <div className="overview-leaderboards-heading">
      <div><h2 id="overview-leaderboards-heading">Leaderboards</h2><p>Your groups across different games</p></div>
      <AppLink className="overview-manage-link" href="/leaderboards">Manage <span aria-hidden="true">↗</span></AppLink>
    </div>
    {displayed.length ? <div className="overview-leaderboard-grid">{displayed.map(board => {
      const gameName = board.boardType === "MULTI_GAME" ? "Multiple games" : board.game?.name ?? "Game unavailable";
      return <AppLink className="overview-leaderboard-card" href={`/leaderboards/${board.id}`} key={board.id}
        aria-label={`Open ${board.name} leaderboard`}>
        <span className="overview-leaderboard-topline"><strong>{board.name}</strong><span aria-hidden="true">↗</span></span>
        <span className="overview-leaderboard-game">{gameName}</span>
        <span className="overview-leaderboard-rank">
          <small>{board.locked ? "Status" : "Your rank · Last 7 days"}</small>
          {board.locked ? <span>Leaderboard currently locked</span> : board.sevenDayRank === null
            ? <span className="unranked">Not ranked this period</span>
            : <strong>{ordinal(board.sevenDayRank)} of {board.sevenDayRankedPlayers} player{board.sevenDayRankedPlayers === 1 ? "" : "s"}</strong>}
        </span>
      </AppLink>;
    })}</div> : <div className="overview-leaderboards-empty empty">No leaderboards yet. Create your first group to compare scores.</div>}
    {values.length > INITIAL_LEADERBOARD_LIMIT ? <button className="text-button overview-show-leaderboards" type="button" onClick={() => setShowAll(value => !value)}>
      {showAll ? "Show fewer leaderboards" : `Show all leaderboards (${values.length})`}
    </button> : null}
  </section>;
}
