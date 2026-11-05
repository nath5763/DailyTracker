import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { LeaderboardDiscord } from "./leaderboard-discord";

const state = vi.hoisted(() => ({ tier: "STANDARD" as "FREE" | "STANDARD", configured: true }));
vi.mock("@/components/billing-actions", () => ({ SubscriptionChoices: () => createElement("span", null, "Paid plans") }));
vi.mock("@/lib/client-cache", () => ({
  useCachedApi: (path: string) => ({
    data: path === "/billing/status" ? { tier: state.tier }
      : path === "/discord/setup-status" ? { configured: state.configured }
      : [{ guildId: "123", channelId: "456", name: null, leaderboardId: "board", url: "https://discord.com/channels/123/456" }],
    refresh: vi.fn(),
  }),
}));

test("only a paid owner with configured backend can start setup", () => {
  const render = (owner: boolean) => renderToStaticMarkup(createElement(LeaderboardDiscord, { boardId: "board", owner }));
  expect(render(true)).toContain("Add leaderboard to Discord");
  expect(render(true)).toContain("Open channel in Discord");
  expect(render(false)).not.toContain("Add leaderboard to Discord");
  state.tier = "FREE";
  expect(render(true)).toContain("Paid plans");
  expect(render(true)).not.toContain("Add leaderboard to Discord");
  state.tier = "STANDARD";
  state.configured = false;
  expect(render(true)).not.toContain("Add leaderboard to Discord");
});
