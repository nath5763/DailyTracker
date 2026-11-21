import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, test, vi } from "vitest";
import { LeaderboardMemberScoresPanel, nextExpandedPlayer } from "./leaderboard-member-scores";

const state = vi.hoisted(() => ({ data: null as unknown, loading: false, error: "", path: "" }));

vi.mock("@/lib/client-cache", () => ({
  leaderboardMemberScoresCachePath: (boardId: string, userId: string, game: string, range: string) => {
    state.path = `/leaderboards/${boardId}/members/${userId}/scores?game=${game}&range=${range}`;
    return state.path;
  },
  useCachedApi: () => ({ data: state.data, loading: state.loading, error: state.error, refresh: vi.fn() }),
}));
vi.mock("@/components/app-link", () => ({ AppLink: ({ href, children, ...props }: { href: string; children: ReactNode }) => createElement("a", { href, ...props }, children) }));

const game = { id: "game", slug: "fermi", name: "Fermi", sourceUrl: "https://fermi.gg", rankingDirection: "lower" as const,
  scoreFormat: { prefix: "", suffix: "×", minimumDecimalPlaces: 2, maximumDecimalPlaces: 2 },
  submission: { exampleShareText: "", puzzleLabel: "Puzzle", scoreLabel: "Score", scoreMin: 0, scoreMax: null, scoreStep: 1, editableFields: [] },
  manualEntry: { supported: false, puzzleIdRequired: false, completionStatuses: [], fields: [] } };

function renderPanel() {
  return renderToStaticMarkup(createElement(LeaderboardMemberScoresPanel,
    { boardId: "board", userId: "player", shareId: "share", game, range: "7d", panelId: "panel" }));
}

beforeEach(() => { state.data = null; state.loading = false; state.error = ""; state.path = ""; });

test("toggle state allows one player and closes the same player", () => {
  const first = nextExpandedPlayer(null, "one", "ranking");
  expect(first).toEqual({ userId: "one", location: "ranking" });
  expect(nextExpandedPlayer(first, "two", "combined")).toEqual({ userId: "two", location: "combined" });
  expect(nextExpandedPlayer(first, "one", "podium")).toBeNull();
});

test("shows inline loading and error states", () => {
  state.loading = true;
  expect(renderPanel()).toContain("Loading player scores…");
  state.loading = false;
  state.error = "Scores could not be loaded.";
  const html = renderPanel();
  expect(html).toContain("Scores could not be loaded.");
  expect(html).toContain("Retry");
});

test("shows the summary, formatted results, and retained profile link", () => {
  state.data = {
    member: { userId: "player", shareId: "share", displayName: "Player", avatarColor: "#fff", owner: false },
    game, period: "7d", rankedPlayerCount: 4,
    ranking: { rank: 2, userId: "player", shareId: "share", displayName: "Player", average: 11.25, gamesPlayed: 2,
      averagePlacement: 1.5, averageScore: 11.25,
      manualResults: 1, assistedResults: 1, unknownAssistanceResults: 0, hints: 2, mistakes: 0, beginnerAssists: 0 },
    scores: [{ id: "score", puzzleKey: "Fermi #12", playedOn: "2026-11-05", primaryScore: 12.5,
      gameName: "Fermi", gameSlug: "fermi", game, metrics: {} }],
  };
  const html = renderPanel();
  expect(state.path).toContain("game=fermi&range=7d");
  expect(html).toContain("#2 of 4");
  expect(html).toContain("Avg. placement");
  expect(html).toContain("#1.5");
  expect(html).toContain("Avg. score");
  expect(html).toContain("11.3");
  expect(html).not.toContain("Leaderboard value");
  expect(html).toContain("12.50×");
  expect(html).toContain("Fermi #12");
  expect(html).toContain("Nov 5, 2026");
  expect(html).toContain('href="/profile/share"');
  expect(html).toContain("View full profile");
});

test("shows a selected-game empty state for a combined-ranked player", () => {
  state.data = {
    member: { userId: "player", shareId: "share", displayName: "Player", avatarColor: "#fff", owner: false },
    game, period: "today", rankedPlayerCount: 1, ranking: null, scores: [],
  };
  expect(renderPanel()).toContain("No Fermi scores for this period.");
});
