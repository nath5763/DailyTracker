import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { ShareableLeaderboardCard } from "./shareable-leaderboard-card";
import type { Leaderboard } from "@/lib/types";

const game = { id: "game", slug: "fermi", name: "Fermi", sourceUrl: "", rankingDirection: "lower" as const,
  scoreFormat: { prefix: "", suffix: "×", minimumDecimalPlaces: 2, maximumDecimalPlaces: 2 },
  submission: {} as Leaderboard["game"]["submission"], manualEntry: {} as Leaderboard["game"]["manualEntry"] };
const player = (rank: number, name: string) => ({ rank, userId: `private-user-${rank}`, shareId: `private-share-${rank}`,
  displayName: name, average: rank + .25, gamesPlayed: 1 });
const board: Leaderboard = { id: "private-board-id", name: "Friends & Family", ownerId: "private-owner",
  game, boardType: "SINGLE_GAME", games: [game], range: "7d", owner: true, members: [], absent: [],
  rankings: [player(1, "Avery <Ace>"), player(2, "B".repeat(120)), player(3, "Charlie"), player(4, "Dana")] };

test("card uses the current leaderboard rankings and excludes private identifiers", () => {
  const html = renderToStaticMarkup(createElement(ShareableLeaderboardCard, { board,
    inviteUrl: "https://dailytracker.cc/join?invite=public-token" }));
  expect(html).toContain("Friends &amp; Family");
  expect(html).toContain("Last 7 days");
  expect(html).toContain("Avery &lt;Ace&gt;");
  expect(html).toContain("1.25×");
  expect(html).toContain("share-card-first");
  expect(html).toContain("dailytracker.cc/join?invite=public-token");
  expect(html).not.toContain("Dana");
  expect(html).not.toContain("private-user");
  expect(html).not.toContain("private-share");
  expect(html).not.toContain("private-board-id");
  expect(html).toContain('class="share-card-name"');
});

test("empty leaderboard card shows an invitation to play without a private link", () => {
  const html = renderToStaticMarkup(createElement(ShareableLeaderboardCard, {
    board: { ...board, rankings: [], owner: false },
  }));
  expect(html).toContain("No scores in this period yet");
  expect(html).not.toContain("JOIN THIS LEADERBOARD");
});

test("a board with one ranked player renders just that placement", () => {
  const html = renderToStaticMarkup(createElement(ShareableLeaderboardCard, {
    board: { ...board, rankings: [board.rankings[0]] },
  }));
  expect(html).toContain("Avery &lt;Ace&gt;");
  expect(html).not.toContain("Charlie");
  expect(html).not.toContain("No scores in this period yet");
});
