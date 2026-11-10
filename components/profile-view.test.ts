import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { ProfileView } from "./profile-view";

const state = vi.hoisted(() => ({ self: true }));
vi.mock("@/components/discord-card", () => ({ DiscordCard: () => createElement("section", null, "Discord controls and setup guide") }));
vi.mock("@/components/game-stats", () => ({ GameStatsList: () => createElement("section", null, "Game statistics") }));
vi.mock("@/components/subscription-panel", () => ({ SubscriptionPanel: () => createElement("section", null, "Subscription and billing controls") }));
vi.mock("@/components/theme-toggle", () => ({ ThemeToggle: () => createElement("section", null, "Dark mode") }));
vi.mock("@/lib/client-cache", () => ({
  useCachedApi: () => ({ data: {
    self: state.self,
    profile: { shareId: "player-uuid", displayName: "Taylor", avatarColor: "#dfff4f" },
    statsByGame: [],
    scores: [{ id: "score", puzzleKey: "42", gameName: "Fermi", playedOn: "2026-11-06", primaryScore: 3, game: { scoreFormat: {} } }],
  }, error: null, errorStatus: null, refresh: vi.fn() }),
}));

test("shows account management without game activity on the signed-in user's profile", () => {
  state.self = true;
  const html = renderToStaticMarkup(createElement(ProfileView, { shareId: "player-uuid" }));
  expect(html).toContain("player-uuid");
  expect(html).toContain("Copy account UUID");
  expect(html).toContain("Discord controls and setup guide");
  expect(html).toContain("Subscription and billing controls");
  expect(html).toContain("Dark mode");
  expect(html).not.toContain("Game statistics");
  expect(html).not.toContain("Score history");
});

test("shows game activity and UUID without private account controls on another profile", () => {
  state.self = false;
  const html = renderToStaticMarkup(createElement(ProfileView, { shareId: "player-uuid" }));
  expect(html).toContain("Game statistics");
  expect(html).toContain("Score history");
  expect(html).toContain("player-uuid");
  expect(html).not.toContain("Discord controls and setup guide");
  expect(html).not.toContain("Subscription and billing controls");
  expect(html).not.toContain("Dark mode");
});
