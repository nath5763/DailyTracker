import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { DashboardView } from "./dashboard-view";

vi.mock("@/components/game-stats", () => ({ GameStatsList: () => createElement("div", null, "Game statistics") }));
vi.mock("@/lib/client-cache", () => ({
  useCachedApi: () => ({ data: {
    profile: { shareId: "account-uuid", displayName: "Taylor" }, statsByGame: [],
    recentScores: [{ id: "score", puzzleKey: "42", gameName: "Fermi", playedOn: "2026-11-06", primaryScore: 3, game: { scoreFormat: {} } }],
    leaderboards: [{ id: "board", name: "Friends", owner: true, locked: false, game: { name: "Fermi" } }],
  }, loading: false, error: null }),
}));

test("keeps activity on Overview without account or Discord management", () => {
  const html = renderToStaticMarkup(createElement(DashboardView));
  expect(html).toContain("Game statistics");
  expect(html).toContain("Recent scores");
  expect(html).toContain("Your leaderboards");
  expect(html).toContain("Add today&#x27;s score");
  expect(html).not.toContain("account-uuid");
  expect(html).not.toContain("Discord");
});
