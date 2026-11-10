import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";
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
const userInstallUrl = "https://discord.com/oauth2/authorize?client_id=123&scope=applications.commands&integration_type=1";

afterEach(() => {
  delete process.env.NEXT_PUBLIC_DISCORD_USER_INSTALL_URL;
  state.tier = "STANDARD";
});

test("points linked and unlinked paid viewers to their leaderboard", () => {
  for (const linked of [false, true]) {
    state.status = { configured: true, linked, linkedAt: null, installUrl };
    const html = renderToStaticMarkup(createElement(DiscordCard));
    expect(html).toContain("Open a multi-game leaderboard you own");
    expect(html).not.toContain("href=\"" + installUrl.replaceAll("&", "&amp;") + "\"");
  }
});

test("hides installation when Discord is unconfigured", () => {
  process.env.NEXT_PUBLIC_DISCORD_USER_INSTALL_URL = userInstallUrl;
  state.status = { configured: false, linked: false, linkedAt: null, installUrl: null };
  const html = renderToStaticMarkup(createElement(DiscordCard));
  expect(html).not.toContain("Add to my Discord apps");
});

test("free members can link Discord and install the user app without server installation", () => {
  process.env.NEXT_PUBLIC_DISCORD_USER_INSTALL_URL = userInstallUrl;
  state.tier = "FREE";
  state.status = { configured: true, linked: false, linkedAt: null, installUrl };
  const html = renderToStaticMarkup(createElement(DiscordCard));
  expect(html).toContain("Generate link code");
  expect(html).toContain("Add to my Discord apps");
  expect(html).toContain(`href="${userInstallUrl.replaceAll("&", "&amp;")}"`);
  expect(html).toContain('target="_blank"');
  expect(html).not.toContain(`href="${installUrl.replaceAll("&", "&amp;")}"`);
});

test("hides the user install action until its public environment variable is configured", () => {
  state.status = { configured: true, linked: true, linkedAt: null, installUrl };
  const html = renderToStaticMarkup(createElement(DiscordCard));
  expect(html).not.toContain("Add to my Discord apps");
});
