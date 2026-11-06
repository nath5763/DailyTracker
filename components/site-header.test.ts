import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { SiteHeader } from "./site-header";

vi.mock("@/components/sign-out-button", () => ({ SignOutButton: () => null }));
vi.mock("@/lib/auth", () => ({ getViewer: vi.fn() }));

test("labels the signed-in profile destination and keeps the avatar", async () => {
  const header = await SiteHeader({ viewer: {
    user: { id: "user", email: "player@example.com" },
    profile: { userId: "user", shareId: "share-id", displayName: "Taylor", avatarColor: "#dfff4f", createdAt: "2026-11-06" },
  } });
  const html = renderToStaticMarkup(header);
  expect(html).toContain('href="/profile/share-id"');
  expect(html).toContain("Profile");
  expect(html).toContain('class="avatar small"');
});
