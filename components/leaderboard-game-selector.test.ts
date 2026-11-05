import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import type { Game } from "@/lib/types";
import { filterLeaderboardGames, leaderboardGameHref, LeaderboardGameSelector } from "./leaderboard-game-selector";

const games = [
  { slug: "fermi", name: "Fermi" },
  { slug: "krillion", name: "Krillion" },
  { slug: "wordle", name: "Wordle" },
] as Game[];

test("searches the leaderboard's games by name and slug", () => {
  expect(filterLeaderboardGames(games, "  KRI ")).toEqual([games[1]]);
  expect(filterLeaderboardGames(games, "WORDLE")).toEqual([games[2]]);
  expect(filterLeaderboardGames(games, "unknown")).toEqual([]);
  expect(filterLeaderboardGames(games, "")).toEqual(games);
});

test("preserves the chosen range when selecting a game", () => {
  expect(leaderboardGameHref("board 1", "wordle", "30d"))
    .toBe("/leaderboards/board%201?game=wordle&range=30d");
});

test("shows the selected game in a closed dropdown", () => {
  const html = renderToStaticMarkup(createElement(LeaderboardGameSelector,
    { boardId: "board", games, selected: games[1], range: "7d" }));
  expect(html).toContain("Krillion");
  expect(html).toContain('aria-expanded="false"');
  expect(html).not.toContain("No matching games");
});
