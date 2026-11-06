import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";
import DiscordGuidePage, { metadata } from "./page";

vi.mock("@/components/site-header", () => ({ SiteHeader: () => createElement("header", null, "Site header") }));
vi.mock("@/lib/auth", () => ({ getViewer: () => Promise.resolve({
  user: { id: "user", email: "player@example.com" },
  profile: { shareId: "profile-uuid" },
}) }));

afterEach(() => delete process.env.NEXT_PUBLIC_DISCORD_USER_INSTALL_URL);

test("documents server channel and Group DM setup", async () => {
  const installUrl = "https://discord.com/oauth2/authorize?client_id=123&integration_type=1";
  process.env.NEXT_PUBLIC_DISCORD_USER_INSTALL_URL = installUrl;
  const html = renderToStaticMarkup(await DiscordGuidePage());
  expect(metadata.title).toBe("Discord Setup Guide");
  expect(html).toContain("SERVER CHANNELS");
  expect(html).toContain("GROUP DMS");
  expect(html).toContain("Manage Server");
  expect(html).toContain("/set-leaderboard");
  expect(html).toContain("/daily");
  expect(html).toContain("/leaderboard");
  expect(html).toContain("does not passively read or parse");
  expect(html).toContain("No subscription required");
  expect(html).toContain("Paid owner feature");
  expect(html).toContain(`href="${installUrl.replaceAll("&", "&amp;")}"`);
  expect(html).toContain('href="/profile/profile-uuid"');
  expect(html).toContain('href="/leaderboards"');
  expect((html.match(/target="_blank"/g) ?? []).length).toBeGreaterThanOrEqual(5);
  expect(html).toContain('rel="noopener noreferrer"');
});
