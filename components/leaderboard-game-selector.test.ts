import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";
import type { Game } from "@/lib/types";
import { filterLeaderboardGames, leaderboardGameHref, LeaderboardGameSelector, quickPickLeaderboardGames,
  nextQuickPickIndex, readLastSelectedLeaderboardGame, rememberSelectedLeaderboardGame } from "./leaderboard-game-selector";

const games = [
  { slug: "fermi", name: "Fermi" },
  { slug: "krillion", name: "Krillion" },
  { slug: "wordle", name: "Wordle" },
  { slug: "connections", name: "Connections" },
  { slug: "globle", name: "Globle" },
  { slug: "murdle", name: "Murdle" },
  { slug: "nerdle", name: "Nerdle" },
] as Game[];

afterEach(() => vi.unstubAllGlobals());

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

test("orders up to five quick picks by recent activity and fills from available games", () => {
  expect(quickPickLeaderboardGames(games, ["wordle", "krillion"], "wordle").map(game => game.slug))
    .toEqual(["wordle", "krillion", "fermi", "connections", "globle"]);
  expect(quickPickLeaderboardGames(games, [], "fermi").map(game => game.slug))
    .toEqual(["fermi", "krillion", "wordle", "connections", "globle"]);
});

test("promotes a More games selection into the quick-pick row for the session", () => {
  expect(quickPickLeaderboardGames(games, ["fermi", "krillion", "wordle", "connections", "globle"], "nerdle")
    .map(game => game.slug)).toEqual(["fermi", "krillion", "wordle", "connections", "nerdle"]);
});

test("supports arrow, Home, and End keys across quick picks", () => {
  expect(nextQuickPickIndex(4, 5, "ArrowRight")).toBe(0);
  expect(nextQuickPickIndex(0, 5, "ArrowLeft")).toBe(4);
  expect(nextQuickPickIndex(3, 5, "Home")).toBe(0);
  expect(nextQuickPickIndex(1, 5, "End")).toBe(4);
  expect(nextQuickPickIndex(1, 5, "Enter")).toBeNull();
});

test("renders quick-pick tabs and a closed searchable More games selector", () => {
  const html = renderToStaticMarkup(createElement(LeaderboardGameSelector,
    { boardId: "board", games, selected: games[1], range: "7d", recentGameSlugs: ["wordle", "krillion"] }));
  expect(html).toContain('role="tablist"');
  expect((html.match(/role="tab"/g) ?? []).length).toBe(5);
  expect(html).toContain("Krillion");
  expect(html).toContain("leaderboard-game-tab active");
  expect(html).toContain("More games");
  expect(html).toContain('aria-expanded="false"');
  expect(html).not.toContain("No matching games");
});

test("persists the last selected game per leaderboard", () => {
  const stored = new Map<string, string>();
  vi.stubGlobal("window", { localStorage: {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
  } });
  rememberSelectedLeaderboardGame("board-a", "wordle");
  rememberSelectedLeaderboardGame("board-b", "fermi");
  expect(readLastSelectedLeaderboardGame("board-a")).toBe("wordle");
  expect(readLastSelectedLeaderboardGame("board-b")).toBe("fermi");
});
