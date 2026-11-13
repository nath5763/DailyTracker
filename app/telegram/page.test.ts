import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import TelegramGuidePage from "./page";

vi.mock("@/components/site-header", () => ({ SiteHeader: () => createElement("header") }));
vi.mock("@/lib/auth", () => ({ getViewer: () => Promise.resolve({
  user: { id: "user" }, profile: { shareId: "profile-uuid" },
}) }));

test("explains private linking, paid group setup, and signup verification", async () => {
  const html = renderToStaticMarkup(await TelegramGuidePage());
  expect(html).toContain('href="/profile/profile-uuid"');
  expect(html).toContain("Paid owner feature");
  expect(html).toContain("/setup");
  expect(html).toContain("/signup");
  expect(html).toContain("Confirm your identity");
  expect(html).toContain("ignores ordinary group conversation");
  expect(html).toContain("complete Share result in that same group message");
  expect(html).toContain("Expand button for private game leaders");
});
