import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { SiteHeader } from "./site-header";

vi.mock("@/components/sign-out-button", () => ({ SignOutButton: () => createElement("button", null, "Sign out") }));
vi.mock("@/lib/auth", () => ({ getViewer: vi.fn() }));

test("labels the signed-in profile destination and keeps the avatar", async () => {
  const header = await SiteHeader({ viewer: {
    user: { id: "user", email: "player@example.com" },
    profile: { userId: "user", shareId: "share-id", displayName: "Taylor", avatarColor: "#dfff4f", createdAt: "2026-11-06" },
    darkMode: false,
  } });
  const html = renderToStaticMarkup(header);
  expect(html).toContain('href="/profile/share-id"');
  expect(html).toContain("Profile");
  expect(html).toContain('class="avatar small"');
  expect(html).toContain('aria-label="Open main menu"');
  expect(html).toContain('aria-expanded="false"');
  expect(html).toContain('id="mobile-main-menu" aria-label="Main navigation" hidden=""');
  expect(html).toContain('href="/dashboard"');
  expect(html).toContain('href="/submit"');
  expect(html).toContain('href="/leaderboards"');
  expect(html).toContain("Sign out");
  expect(html).not.toContain('href="/daily"');
});

test("shows guest destinations and sign in without member links", async () => {
  const header = await SiteHeader({ viewer: { user: null, profile: null, darkMode: false } });
  const html = renderToStaticMarkup(header);
  expect(html).toContain('href="/games"');
  expect(html).toContain('href="/pricing"');
  expect(html).toContain('href="/auth"');
  expect(html).toContain("Sign in");
  expect(html).toContain('aria-label="Open main menu"');
  expect(html).toContain('id="mobile-main-menu" aria-label="Main navigation" hidden=""');
  expect(html).not.toContain('href="/leaderboards"');
  expect(html).not.toContain("Sign out");
});
