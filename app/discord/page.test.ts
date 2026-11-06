import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import DiscordGuidePage, { metadata } from "./page";

vi.mock("@/components/site-header", () => ({ SiteHeader: () => createElement("header", null, "Site header") }));

test("documents server channel and Group DM setup", () => {
  const html = renderToStaticMarkup(createElement(DiscordGuidePage));
  expect(metadata.title).toBe("Discord Setup Guide");
  expect(html).toContain("SERVER CHANNELS");
  expect(html).toContain("GROUP DMS");
  expect(html).toContain("Manage Server");
  expect(html).toContain("/set-leaderboard");
  expect(html).toContain("/daily");
  expect(html).toContain("/leaderboard");
  expect(html).toContain("does not passively read or parse");
});
