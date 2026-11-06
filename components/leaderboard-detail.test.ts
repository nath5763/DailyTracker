import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { LeaderboardDetail } from "./leaderboard-detail";

const state = vi.hoisted(() => ({ summaries: null as unknown, board: null as unknown,
  cachePathArgs: null as [string, string | undefined, string] | null }));

vi.mock("@/components/app-data-provider", () => ({ useAppData: () => ({ userId: "viewer" }) }));
vi.mock("@/components/copy-leaderboard", () => ({ CopyLeaderboard: () => null }));
vi.mock("@/components/member-manager", () => ({ MemberManager: () => null, RemoveMemberButton: () => null }));
vi.mock("@/components/billing-actions", () => ({ ManageBillingButton: () => null, SubscribeButton: () => null }));
vi.mock("@/lib/client-cache", () => ({
  leaderboardCachePath: (...args: [string, string | undefined, string]) => {
    state.cachePathArgs = args;
    return "/board-detail";
  },
  invalidateClientCachePrefix: vi.fn(),
  useCachedApi: (path: string) => ({
    data: path === "/leaderboards" ? state.summaries : path === "/board-detail" ? state.board : null,
    error: null, errorStatus: null, refresh: vi.fn(),
  }),
}));

const game = { id: "game", slug: "fermi", name: "Fermi", sourceUrl: "https://fermi.gg",
  rankingDirection: "lower", scoreFormat: { prefix: "", suffix: "×", minimumDecimalPlaces: 2, maximumDecimalPlaces: 2 } };
const summary = { id: "board", name: "Friends", ownerId: "owner", owner: false, game, games: [game],
  boardType: "SINGLE_GAME", locked: false };

function render() { return renderToStaticMarkup(createElement(LeaderboardDetail, { id: "board" })); }
function expectBackLink(html: string) {
  expect(html).toContain('href="/leaderboards"');
  expect(html).toContain("Back to all leaderboards");
}

test("shows a back button on normal and locked leaderboards", () => {
  state.summaries = [summary];
  state.board = { ...summary, members: [], rankings: [], absent: [], range: "today" };
  expectBackLink(render());
  state.summaries = [{ ...summary, locked: true }];
  expectBackLink(render());
});

test("shows a back button while loading and when a leaderboard is unavailable", () => {
  state.summaries = null;
  state.board = null;
  expectBackLink(render());
  state.summaries = [];
  expectBackLink(render());
});

test("shows position, full rankings, then progress", () => {
  state.summaries = [summary];
  state.board = { ...summary, members: [{ userId: "viewer", displayName: "Viewer", avatarColor: "#dfff4f", owner: false }],
    rankings: [{ rank: 1, userId: "viewer", shareId: "viewer-share", displayName: "Viewer", average: 10, gamesPlayed: 1 }],
    absent: [], range: "today" };
  const html = render();
  expect(html.indexOf("YOUR POSITION")).toBeLessThan(html.indexOf("<h2>Leaderboard</h2>"));
  expect(html.indexOf("<h2>Leaderboard</h2>")).toBeLessThan(html.indexOf('href="/profile/viewer-share"'));
  expect(html.indexOf('href="/profile/viewer-share"')).toBeLessThan(html.indexOf("<h2>Progress</h2>"));
});

test("keeps the leaderboard section visible when no one has scored", () => {
  state.summaries = [summary];
  state.board = { ...summary, members: [], rankings: [], absent: [], range: "today" };
  const html = render();
  expect(html.indexOf("YOUR POSITION")).toBeLessThan(html.indexOf("<h2>Leaderboard</h2>"));
  expect(html.indexOf("<h2>Leaderboard</h2>")).toBeLessThan(html.indexOf("Nobody has posted a score"));
  expect(html.indexOf("Nobody has posted a score")).toBeLessThan(html.indexOf("<h2>Progress</h2>"));
});

test("lets the API choose the most recently played game for an all-game board", () => {
  const krillion = { ...game, id: "krillion", slug: "krillion", name: "Krillion", rankingDirection: "higher" };
  state.summaries = [{ ...summary, boardType: "MULTI_GAME", games: [game, krillion] }];
  state.board = { ...summary, boardType: "MULTI_GAME", members: [], rankings: [], absent: [], range: "today" };
  render();
  expect(state.cachePathArgs).toEqual(["board", undefined, "today"]);
});
