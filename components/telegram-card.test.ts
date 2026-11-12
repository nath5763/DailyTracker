import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { TelegramCard } from "./telegram-card";

const state = vi.hoisted(() => ({ linked: false, configured: true }));
vi.mock("@/components/app-data-provider", () => ({ useAppData: () => ({ userId: "viewer" }) }));
vi.mock("@/lib/client-cache", () => ({
  useCachedApi: () => ({ data: { ...state, botUrl: "https://t.me/DailyTrackerBot?start=start",
    botUsername: "DailyTrackerBot" }, loading: false }),
  invalidateClientCache: vi.fn(),
}));

test("offers a private link code when unlinked and an unlink control when linked", () => {
  state.linked = false;
  expect(renderToStaticMarkup(createElement(TelegramCard))).toContain("Generate link code");
  state.linked = true;
  expect(renderToStaticMarkup(createElement(TelegramCard))).toContain("Unlink Telegram");
});
