import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { LeaderboardDetail } from "./leaderboard-detail";

const state = vi.hoisted(() => ({ summaries: null as unknown, board: null as unknown }));

vi.mock("@/components/app-data-provider", () => ({ useAppData: () => ({ userId: "viewer" }) }));
vi.mock("@/components/copy-leaderboard", () => ({ CopyLeaderboard: () => null }));
vi.mock("@/components/member-manager", () => ({ MemberManager: () => null, RemoveMemberButton: () => null }));
vi.mock("@/components/billing-actions", () => ({ ManageBillingButton: () => null, SubscribeButton: () => null }));
vi.mock("@/lib/client-cache", () => ({
  leaderboardCachePath: () => "/board-detail",
  invalidateClientCachePrefix: vi.fn(),
  useCachedApi: (path: string) => ({
    data: path === "/leaderboards" ? state.summaries : path === "/board-detail" ? state.board : null,
    error: null, errorStatus: null, refresh: vi.fn(),
  }),
}));

const game = { id: "game", slug: "fermi", name: "Fermi", sourceUrl: "https://fermi.gg",
  rankingDirection: "higher", scoreFormat: { prefix: "", suffix: "×", minimumDecimalPlaces: 2, maximumDecimalPlaces: 2 } };
const summary = { id: "board", name: "Friends", ownerId: "owner", owner: false, game, games: [game], locked: false };

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
