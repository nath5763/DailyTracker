import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { DashboardView } from "./dashboard-view";

vi.mock("@/components/overview-games", () => ({ OverviewGames: () => createElement("div", null, "Game statistics") }));
vi.mock("@/components/overview-leaderboards", () => ({ OverviewLeaderboards: () => createElement("div", null, "Leaderboard cards") }));
vi.mock("@/lib/client-cache", () => ({
  useCachedApi: () => ({ data: {
    profile: { shareId: "account-uuid", displayName: "Taylor" }, statsByGame: [],
    leaderboards: [],
  }, loading: false, error: null }),
}));

test("renders the compact Overview header without a personalized greeting or redundant labels", () => {
  const html = renderToStaticMarkup(createElement(DashboardView));
  expect(html).toContain("Game statistics");
  expect(html).toContain("Leaderboard cards");
  expect(html).toContain("<h1>Overview</h1>");
  expect(html).toContain("Your scores and activity");
  expect(html).toContain("Add score");
  expect(html).not.toContain("YOUR OVERVIEW");
  expect(html).not.toContain("Hey, Taylor");
  expect(html).not.toContain("account-uuid");
  expect(html).not.toContain("Discord");
});
