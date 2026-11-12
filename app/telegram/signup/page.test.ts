import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import TelegramSignupPage from "./page";

const state = vi.hoisted(() => ({ valid: true, user: false, profile: false }));
vi.mock("@/components/site-header", () => ({ SiteHeader: () => createElement("header") }));
vi.mock("@/components/telegram-signup-button", () => ({
  TelegramSignupButton: () => createElement("button", null, "Send Telegram confirmation"),
}));
vi.mock("@/lib/api", () => ({ apiFetch: () => Promise.resolve({ valid: state.valid }) }));
vi.mock("@/lib/auth", () => ({ getViewer: () => Promise.resolve({
  user: state.user ? { id: "user" } : null,
  profile: state.profile ? { shareId: "profile" } : null,
}) }));

const token = "a".repeat(43);

test("offers account creation and preserves the one-time continuation", async () => {
  state.valid = true; state.user = false; state.profile = false;
  const html = renderToStaticMarkup(await TelegramSignupPage({ searchParams: Promise.resolve({ intent: token }) }));
  expect(html).toContain("Create account");
  expect(html).toContain(encodeURIComponent(`/telegram/signup?intent=${token}`));
});

test("requires profile and original Telegram confirmation", async () => {
  state.valid = true; state.user = true; state.profile = false;
  expect(renderToStaticMarkup(await TelegramSignupPage({ searchParams: Promise.resolve({ intent: token }) })))
    .toContain("Set up profile");
  state.profile = true;
  expect(renderToStaticMarkup(await TelegramSignupPage({ searchParams: Promise.resolve({ intent: token }) })))
    .toContain("Send Telegram confirmation");
});

test("rejects expired signup intents", async () => {
  state.valid = false;
  const html = renderToStaticMarkup(await TelegramSignupPage({ searchParams: Promise.resolve({ intent: token }) }));
  expect(html).toContain("invalid, expired, or already used");
  expect(html).not.toContain("Send Telegram confirmation");
});
