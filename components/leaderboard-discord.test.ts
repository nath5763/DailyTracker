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
  expect(render(true)).toContain("Remove</button>");
  expect(render(false)).not.toContain("Add leaderboard to Discord");
  expect(render(false)).not.toContain("Remove</button>");
  state.tier = "FREE";
  expect(render(true)).toContain("Paid plans");
  expect(render(true)).not.toContain("Add leaderboard to Discord");
  expect(render(true)).toContain("Remove</button>");
  state.tier = "STANDARD";
  state.configured = false;
  expect(render(true)).not.toContain("Add leaderboard to Discord");
});

test("shows every member the leaderboard UUID and Discord guide without owner controls", () => {
  state.tier = "STANDARD";
  state.configured = true;
  const html = renderToStaticMarkup(createElement(LeaderboardDiscord, { boardId: "board-uuid", owner: false }));
  expect(html).toContain('value="board-uuid"');
  expect(html).toContain("Copy leaderboard UUID");
  expect(html).toContain("/set-leaderboard");
  expect(html).toContain('href="/discord"');
  expect(html).not.toContain("Add leaderboard to Discord");
  expect(html).not.toContain("Remove</button>");
});
