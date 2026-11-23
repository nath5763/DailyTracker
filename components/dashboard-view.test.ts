import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { DashboardView } from "./dashboard-view";

vi.mock("@/components/overview-games", () => ({ OverviewGames: () => createElement("div", null, "Game statistics") }));
vi.mock("@/lib/client-cache", () => ({
  useCachedApi: () => ({ data: {
    profile: { shareId: "account-uuid", displayName: "Taylor" }, statsByGame: [],
    leaderboards: [{ id: "board", name: "Friends", owner: true, locked: false, game: { name: "Fermi" } }],
  }, loading: false, error: null }),
}));

test("keeps activity on Overview without account or Discord management", () => {
  const html = renderToStaticMarkup(createElement(DashboardView));
  expect(html).toContain("Game statistics");
  expect(html).toContain("Your leaderboards");
  expect(html).toContain("Add today&#x27;s score");
  expect(html).not.toContain("Recent scores");
  expect(html).not.toContain("account-uuid");
  expect(html).not.toContain("Discord");
});
