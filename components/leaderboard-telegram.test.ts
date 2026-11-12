import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { LeaderboardTelegram } from "./leaderboard-telegram";

const state = vi.hoisted(() => ({ tier: "STANDARD" as "FREE" | "STANDARD", groups: [] as { chatId: number; title: string }[] }));
vi.mock("@/components/app-data-provider", () => ({ useAppData: () => ({ userId: "viewer" }) }));
vi.mock("@/lib/client-cache", () => ({
  useCachedApi: (path: string) => ({ data: path === "/billing/status" ? { tier: state.tier } :
    path === "/telegram/status" ? { configured: true, botUsername: "DailyTrackerBot" } : state.groups,
    refresh: vi.fn() }),
  invalidateClientCache: vi.fn(),
}));

test("shows paid owner setup and connected groups", () => {
  state.tier = "STANDARD";
  state.groups = [{ chatId: -100123, title: "Friday Friends" }];
  const html = renderToStaticMarkup(createElement(LeaderboardTelegram, { boardId: "board-uuid", owner: true }));
  expect(html).toContain("/setup board-uuid");
  expect(html).toContain("Friday Friends");
  expect(html).toContain("Disconnect");
  expect(html).toContain("startgroup=setup");
});

test("does not offer group setup to a free owner", () => {
  state.tier = "FREE";
  state.groups = [];
  const html = renderToStaticMarkup(createElement(LeaderboardTelegram, { boardId: "board-uuid", owner: true }));
  expect(html).toContain("paid plan is required");
  expect(html).not.toContain("startgroup=setup");
});
