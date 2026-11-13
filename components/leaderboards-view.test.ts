import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { LeaderboardsView } from "./leaderboards-view";

const state = vi.hoisted(() => ({ boards: [] as unknown[], tier: "FREE" as "FREE" | "STANDARD" | "PREMIUM" }));
vi.mock("@/components/app-data-provider", () => ({ useAppData: () => ({ userId: "viewer", shareId: "share", games: [] }) }));
vi.mock("@/components/create-leaderboard", () => ({ CreateLeaderboard: () => null }));
vi.mock("@/components/billing-actions", () => ({
  ChangePlanButton: () => createElement("button", null, "Change plan"),
  ManageBillingButton: () => createElement("button", null, "Manage billing"),
  SubscriptionChoices: () => null,
}));
vi.mock("@/lib/client-cache", () => ({
  invalidateClientCache: vi.fn(),
  useCachedApi: (path: string) => ({ data: path === "/leaderboards" ? state.boards : {
    tier: state.tier, status: null, singleGameCount: 0, singleGameLimit: 5, allGameCount: 0, allGameLimit: 0,
  }, error: "", refresh: vi.fn() }),
}));

const game = { slug: "fermi", name: "Fermi" };
const single = { id: "single", name: "Fermi only", game, boardType: "SINGLE_GAME", locked: false, owner: true };
const all = { id: "all", name: "Every game", game, boardType: "MULTI_GAME", locked: true, owner: false };
const render = () => renderToStaticMarkup(createElement(LeaderboardsView));

test("separates all-game boards from single-game groups using board type", () => {
  state.boards = [single, all];
  const html = render();
  const allSection = html.slice(html.indexOf('id="all-games-heading"'), html.indexOf("Single-game leaderboards"));
  expect(allSection).toContain("Every game");
  expect(allSection).toContain("Locked");
  expect(allSection).not.toContain("Fermi only");
  expect(html.slice(html.indexOf("Single-game leaderboards"))).toContain("Fermi only");
});

test("omits the all-game section when none exist", () => {
  state.boards = [single];
  expect(render()).not.toContain("All-game leaderboards");
  expect(render()).toContain("Single-game leaderboards");
});

test("paid members can open a dedicated plan change flow", () => {
  state.tier = "STANDARD";
  const html = render();
  expect(html).toContain("Change plan");
  expect(html).toContain("Manage billing");
  state.tier = "FREE";
});
