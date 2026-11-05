import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { DiscordCard } from "./discord-card";

const state = vi.hoisted(() => ({
  status: null as null | { configured: boolean; linked: boolean; linkedAt: string | null; installUrl: string | null },
  tier: "STANDARD" as "FREE" | "STANDARD" | "PREMIUM",
}));

vi.mock("@/components/app-data-provider", () => ({ useAppData: () => ({ userId: "viewer" }) }));
vi.mock("@/lib/client-cache", () => ({
  useCachedApi: (path: string) => ({ data: path === "/billing/status" ? { tier: state.tier } : state.status, loading: false, refresh: vi.fn() }),
  invalidateClientCache: vi.fn(),
}));

const installUrl = "https://discord.com/oauth2/authorize?client_id=123&scope=applications.commands&integration_type=0";

test("points linked and unlinked paid viewers to their leaderboard", () => {
  for (const linked of [false, true]) {
    state.status = { configured: true, linked, linkedAt: null, installUrl };
    const html = renderToStaticMarkup(createElement(DiscordCard));
    expect(html).toContain("Open a leaderboard you own");
    expect(html).not.toContain("href=\"" + installUrl.replaceAll("&", "&amp;") + "\"");
  }
});

test("hides installation when Discord is unconfigured", () => {
  state.status = { configured: false, linked: false, linkedAt: null, installUrl: null };
  const html = renderToStaticMarkup(createElement(DiscordCard));
  expect(html).not.toContain("Add to Discord");
});

test("free members can link Discord but cannot install it", () => {
  state.tier = "FREE";
  state.status = { configured: true, linked: false, linkedAt: null, installUrl };
  const html = renderToStaticMarkup(createElement(DiscordCard));
  expect(html).toContain("Generate link code");
  expect(html).not.toContain("Add to Discord");
  state.tier = "STANDARD";
});
