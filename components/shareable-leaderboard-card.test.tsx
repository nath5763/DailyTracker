import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { gameResultStats, ShareableLeaderboardCard } from "./shareable-leaderboard-card";
import type { Leaderboard, LeaderboardMemberScores, Score } from "@/lib/types";

const game: Leaderboard["game"] = { id: "game", slug: "wordle", name: "Wordle", sourceUrl: "", rankingDirection: "lower",
  scoreFormat: { prefix: "", suffix: " guesses", minimumDecimalPlaces: 0, maximumDecimalPlaces: 2 },
  submission: { scoreLabel: "Guesses" } as Leaderboard["game"]["submission"],
  manualEntry: {} as Leaderboard["game"]["manualEntry"] };
const player = (rank: number, name: string) => ({ rank, userId: `private-user-${rank}`, shareId: `private-share-${rank}`,
  displayName: name, average: rank + .25, gamesPlayed: 2, displayScore: "12 leaderboard pts" });
const board: Leaderboard = { id: "private-board-id", name: "Friends & Family", ownerId: "private-owner",
  game, boardType: "SINGLE_GAME", games: [game], range: "7d", owner: true,
  members: [1, 2, 3, 4].map((rank) => ({ userId: `private-user-${rank}`, shareId: `private-share-${rank}`,
    displayName: rank === 4 ? "Dana" : `Player ${rank}`, avatarColor: "", owner: false })), absent: [],
  rankings: [player(1, "Avery <Ace>"), player(2, "B".repeat(120)), player(3, "Charlie"), player(4, "Dana")] };
const score = (value: number): Score => ({ id: `private-score-${value}`, playedOn: "2026-11-10", primaryScore: value,
  game, gameName: game.name, gameSlug: game.slug, puzzleKey: "Wordle #1" });
const details = (...values: number[]): LeaderboardMemberScores => ({ scores: values.map(score),
  member: board.members[0], game, period: "7d", ranking: null, rankedPlayerCount: 4 });
const resultsByPlayer = { "private-user-1": details(2, 7), "private-user-2": details(3, 5),
  "private-user-3": details(4, 6), "private-user-4": details(5, 7) };
const render = (currentUserId: string, value = board, results: Record<string, LeaderboardMemberScores> = resultsByPlayer) =>
  renderToStaticMarkup(createElement(ShareableLeaderboardCard, { board: value, currentUserId, resultsByPlayer: results }));

test("longer-period card shows top three plus the current player's rank and game stats", () => {
  const html = render("private-user-4");
  expect(html).toContain("Friends &amp; Family");
  expect(html).toContain("Last 7 days");
  expect(html).toContain("Avery &lt;Ace&gt;");
  expect(html).toContain("Dana");
  expect(html).toContain("#4");
  expect(html).toContain("YOU");
  expect(html).toContain("RESULTS");
  expect(html).toContain("BEST");
  expect(html).toContain("AVERAGE");
  expect(html).toContain("4.5 guesses");
  expect(html).not.toContain("leaderboard pts");
  expect(html).not.toContain("private-user");
  expect(html).not.toContain("private-board-id");
  expect(html).toContain("Join Daily Tracker at dailytracker.cc");
});

test("today shows the game result without count, best, or average and does not duplicate the current player", () => {
  const html = render("private-user-1", { ...board, range: "today" });
  expect(html).toContain("Today’s Guesses");
  expect(html).toContain("2 guesses");
  expect(html).not.toContain("<small>RESULTS</small>");
  expect(html).not.toContain("<small>BEST</small>");
  expect(html).not.toContain("<small>AVERAGE</small>");
  expect(html.match(/share-card-own/g)).toHaveLength(1);
  expect(html).not.toContain("Dana");
});

test("an unranked current player remains visible without invented stats", () => {
  const html = render("private-user-4", { ...board, rankings: board.rankings.slice(0, 3) });
  expect(html).toContain("Dana");
  expect(html).toContain("Unranked this period");
  expect(html).not.toContain("#4");
});

test("empty period still shows the current player as unranked", () => {
  const html = render("private-user-4", { ...board, rankings: [] }, {});
  expect(html).toContain("No scores in this period yet");
  expect(html).toContain("Dana");
  expect(html).toContain("Unranked this period");
});

test("best follows game direction and average includes failed attempts", () => {
  expect(gameResultStats([score(2), score(7)], game)).toEqual({ count: 2, best: "2 guesses", average: "4.5 guesses" });
  const higher = { ...game, rankingDirection: "higher" as const };
  expect(gameResultStats([score(2), score(7)], higher)?.best).toBe("7 guesses");
  expect(gameResultStats([], game)).toBeNull();
});
