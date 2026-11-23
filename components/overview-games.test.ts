import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, test, vi } from "vitest";
import type { Game, GameStats, SubmissionDetail, SubmissionHistory } from "@/lib/types";
import { GameDetails, nextOverviewSelection, orderGameStats, OverviewGames, SubmissionDetails, trendBars, visibleGameStats } from "./overview-games";

const api = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock("@/lib/client-cache", () => ({ useCachedApi: () => api.current }));

const game: Game = {
  id: "game-id", slug: "wordle", name: "Wordle", sourceUrl: "https://example.com", rankingDirection: "lower",
  scoreFormat: { prefix: "", suffix: "/6", minimumDecimalPlaces: 0, maximumDecimalPlaces: 0, kind: "guesses" },
  submission: { exampleShareText: "", puzzleLabel: "Puzzle", scoreLabel: "Guesses", scoreMin: 1, scoreMax: 7, scoreStep: 1, editableFields: [] },
  manualEntry: { supported: false, puzzleIdRequired: false, completionStatuses: [], fields: [] },
};

function stats(index: number): GameStats {
  return {
    game: { ...game, id: `game-${index}`, slug: `game-${index}`, name: `Game ${index}` },
    average: 3 + index / 10, best: 2, currentStreak: index, results: index + 1,
    lastPlayedOn: `2026-11-${String(index + 1).padStart(2, "0")}`,
    lastSubmittedAt: `2026-11-${String(index + 1).padStart(2, "0")}T12:00:00Z`,
  };
}

beforeEach(() => {
  api.current = { data: null, loading: false, error: "", refresh: vi.fn() };
});

test("orders played games by recent activity and initially limits the dashboard to eight cards", () => {
  const values = Array.from({ length: 10 }, (_, index) => stats(index));
  expect(orderGameStats(values).map(value => value.game.name).slice(0, 3)).toEqual(["Game 9", "Game 8", "Game 7"]);
  expect(visibleGameStats(values, false)).toHaveLength(8);
  expect(visibleGameStats(values, true)).toHaveLength(10);
  const html = renderToStaticMarkup(createElement(OverviewGames, { values }));
  expect(html.match(/class="overview-game-card/g)).toHaveLength(8);
  expect(html).toContain("Show all my games (10)");
  expect(html).toContain("All-time average");
  expect(html).toContain("Personal best");
  expect(html).toContain("Streak");
});

test("card selection toggles one game and resets pagination when switching games", () => {
  const initial = { gameSlug: null, page: 4, submissionId: "submission" };
  const opened = nextOverviewSelection(initial, "wordle");
  expect(opened).toEqual({ gameSlug: "wordle", page: 0, submissionId: null });
  expect(nextOverviewSelection({ ...opened, page: 2 }, "wordle")).toEqual({ gameSlug: null, page: 2, submissionId: null });
  expect(nextOverviewSelection({ gameSlug: "wordle", page: 2, submissionId: "one" }, "fermi"))
    .toEqual({ gameSlug: "fermi", page: 0, submissionId: null });
});

test("history renders server pagination, deterministic order, and game-specific display scores", () => {
  const history: SubmissionHistory = {
    game, page: 1, pageSize: 10, totalSubmissions: 24, totalPages: 3, trend: [],
    submissions: [
      { id: "new", puzzleKey: "200", playedOn: "2026-11-21", submittedAt: "2026-11-21T15:00:00Z", primaryScore: 4, metrics: { displayScore: "4/6" }, submissionMethod: "SHARE_TEXT", details: [] },
      { id: "old", puzzleKey: "199", playedOn: "2026-11-20", submittedAt: "2026-11-20T15:00:00Z", primaryScore: 3, metrics: { displayScore: "3/6" }, submissionMethod: "SHARE_TEXT", details: [{ label: "Hints", value: "0" }] },
    ],
  };
  api.current = { data: history, loading: false, error: "", refresh: vi.fn() };
  const html = renderToStaticMarkup(createElement(GameDetails, { gameSlug: "wordle", page: 1, selectedSubmissionId: null, onPageChange: vi.fn(), onSubmissionChange: vi.fn() }));
  expect(html.indexOf("Nov 21, 2026")).toBeLessThan(html.indexOf("Nov 20, 2026"));
  expect(html).toContain("4/6");
  expect(html).toContain("Hints 0");
  expect(html).toContain("Page 2 of 3");
});

test("submission details render complete metadata and preserve original share-text line breaks", () => {
  const detail: SubmissionDetail = {
    id: "submission-id", puzzleKey: "200", playedOn: "2026-11-21", submittedAt: "2026-11-21T15:30:00Z",
    primaryScore: 4.234, metrics: { displayScore: "4/6", clueUsed: true, components: [1.234, 2, 3] },
    submissionMethod: "SHARE_TEXT", parserVersion: 3, rawText: "Wordle 200 4/6\nâ¬›ðŸŸ©â¬›ðŸŸ©â¬›\nðŸŸ©ðŸŸ©ðŸŸ©ðŸŸ©ðŸŸ©", game,
    details: [{ label: "Hints", value: "0" }],
  };
  api.current = { data: detail, loading: false, error: "", refresh: vi.fn() };
  const html = renderToStaticMarkup(createElement(SubmissionDetails, { id: detail.id, onClose: vi.fn() }));
  expect(html).toContain("Formatted score");
  expect(html).toContain("4/6");
  expect(html).toContain("4.23");
  expect(html).toContain("[1.23, 2, 3]");
  expect(html).not.toContain("1.234");
  expect(html).toContain("Clue Used");
  expect(html).toContain("Wordle 200 4/6\n");
  expect(html).toContain("Original share text");
});

test("trend marks respect higher-is-better and lower-is-better without connecting discrete results", () => {
  const points = [
    { id: "new", playedOn: "2026-11-21", primaryScore: 10, metrics: {} },
    { id: "old", playedOn: "2026-11-20", primaryScore: 20, metrics: {} },
  ];
  const higher = trendBars(points, "higher");
  const lower = trendBars(points, "lower");
  expect(higher.find(point => point.id === "old")?.height).toBeGreaterThan(higher.find(point => point.id === "new")?.height ?? 0);
  expect(lower.find(point => point.id === "new")?.height).toBeGreaterThan(lower.find(point => point.id === "old")?.height ?? 0);
});

test("history has loading, empty, and failure states", () => {
  api.current = { data: null, loading: true, error: "", refresh: vi.fn() };
  expect(renderToStaticMarkup(createElement(GameDetails, { gameSlug: "wordle", page: 0, selectedSubmissionId: null, onPageChange: vi.fn(), onSubmissionChange: vi.fn() }))).toContain("Loading game history");
  api.current = { data: null, loading: false, error: "History is unavailable.", refresh: vi.fn() };
  expect(renderToStaticMarkup(createElement(GameDetails, { gameSlug: "wordle", page: 0, selectedSubmissionId: null, onPageChange: vi.fn(), onSubmissionChange: vi.fn() }))).toContain("History is unavailable.");
  api.current = { data: { game, submissions: [], trend: [], page: 0, pageSize: 10, totalSubmissions: 0, totalPages: 0 }, loading: false, error: "", refresh: vi.fn() };
  expect(renderToStaticMarkup(createElement(GameDetails, { gameSlug: "wordle", page: 0, selectedSubmissionId: null, onPageChange: vi.fn(), onSubmissionChange: vi.fn() }))).toContain("No submission history");
});
