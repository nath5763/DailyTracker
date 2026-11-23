import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import type { DashboardBoardSummary } from "@/lib/types";
import { ordinal, OverviewLeaderboards, visibleLeaderboards } from "./overview-leaderboards";

function board(index: number, overrides: Partial<DashboardBoardSummary> = {}): DashboardBoardSummary {
  return {
    id: `board-${index}`, name: `Group ${index}`, ownerId: "owner", owner: index === 0,
    game: { id: `game-${index}`, slug: `game-${index}`, name: `Game ${index}`, sourceUrl: "#",
      rankingDirection: "lower", scoreFormat: { prefix: "", suffix: " pts", minimumDecimalPlaces: 0, maximumDecimalPlaces: 0 },
      submission: { exampleShareText: "", puzzleLabel: "Puzzle", scoreLabel: "Score", scoreMin: 0, scoreMax: null, scoreStep: 1, editableFields: [] },
      manualEntry: { supported: false, puzzleIdRequired: false, completionStatuses: [], fields: [] } },
    boardType: "SINGLE_GAME", games: [], locked: false, createdAt: "2026-11-22T12:00:00Z",
    sevenDayRank: index + 1, sevenDayRankedPlayers: 8,
    ...overrides,
  };
}

describe("OverviewLeaderboards", () => {
  test("shows at most six cards initially with whole-card navigation and management in the header", () => {
    const values = Array.from({ length: 8 }, (_, index) => board(index));
    const html = renderToStaticMarkup(createElement(OverviewLeaderboards, { values }));
    expect(visibleLeaderboards(values, false)).toHaveLength(6);
    expect(visibleLeaderboards(values, true)).toHaveLength(8);
    expect(html.match(/class="overview-leaderboard-card"/g)).toHaveLength(6);
    expect(html).toContain('href="/leaderboards/board-0"');
    expect(html).toContain("Manage");
    expect(html).toContain('href="/leaderboards"');
    expect(html).toContain("Show all leaderboards (8)");
  });

  test("renders ranked, unranked, multi-game, and locked summaries without using membership totals", () => {
    const values = [
      board(0, { name: "Aram Loss Streakers", sevenDayRank: 2, sevenDayRankedPlayers: 4 }),
      board(1, { sevenDayRank: null, sevenDayRankedPlayers: 0 }),
      board(2, { boardType: "MULTI_GAME", sevenDayRank: 1, sevenDayRankedPlayers: 3 }),
      board(3, { locked: true, sevenDayRank: null, sevenDayRankedPlayers: 0 }),
    ];
    const html = renderToStaticMarkup(createElement(OverviewLeaderboards, { values }));
    expect(html).toContain("Your rank · Last 7 days");
    expect(html).toContain("2nd of 4 players");
    expect(html).toContain("Not ranked this period");
    expect(html).toContain("Multiple games");
    expect(html).toContain("Leaderboard currently locked");
  });

  test("formats natural ordinal suffixes", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23].map(ordinal))
      .toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd"]);
  });

  test("uses shared semantic theme tokens instead of component-specific dark colors", () => {
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
    expect(css).toMatch(/\.overview-leaderboard-card \{[^}]*background: var\(--cream\)/s);
    expect(css).toMatch(/\.overview-leaderboard-card \{[^}]*border: 1px solid var\(--line\)/s);
    expect(css).toMatch(/\.overview-leaderboard-game \{[^}]*color: var\(--purple\)/s);
    expect(css).not.toMatch(/html\[data-theme="dark"\] \.overview-leaderboard/);
  });
});
