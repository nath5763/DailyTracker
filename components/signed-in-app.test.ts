import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { SignedInApp } from "./signed-in-app";

vi.mock("next/navigation", () => ({
  usePathname: () => "/leaderboards/board-id",
  useSearchParams: () => new URLSearchParams("discord=ready&setup=setup-token"),
}));
vi.mock("@/components/app-link", () => ({ LocalNavigationProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/components/leaderboard-detail", () => ({
  LeaderboardDetail: ({ id, discordStatus, setupToken }: { id: string; discordStatus?: string; setupToken?: string }) =>
    createElement("div", { "data-board": id, "data-discord": discordStatus, "data-setup": setupToken }),
}));
vi.mock("@/components/dashboard-view", () => ({ DashboardView: () => null }));
vi.mock("@/components/leaderboards-view", () => ({ LeaderboardsView: () => null }));
vi.mock("@/components/profile-view", () => ({ ProfileView: () => null }));
vi.mock("@/components/submit-view", () => ({ SubmitView: () => null }));

test("passes Discord callback parameters to the active leaderboard view", () => {
  const html = renderToStaticMarkup(createElement(SignedInApp, { header: null }));
  expect(html).toContain('data-board="board-id"');
  expect(html).toContain('data-discord="ready"');
  expect(html).toContain('data-setup="setup-token"');
});
