import { afterEach, expect, test, vi } from "vitest";
import { isSignedInPath, navigateInApp } from "./app-link";

afterEach(() => vi.unstubAllGlobals());

test("local navigation covers signed-in routes without a page request", () => {
  const pushState = vi.fn();
  const replaceState = vi.fn();
  const assign = vi.fn();
  vi.stubGlobal("window", { location: { origin: "https://dailytracker.cc", assign }, history: { pushState, replaceState } });
  for (const path of ["/dashboard", "/submit", "/leaderboards", "/leaderboards/123", "/profile/456"]) {
    expect(isSignedInPath(path)).toBe(true);
    navigateInApp(path);
  }
  navigateInApp("/leaderboards/123?game=fermi&range=7d", true);
  expect(pushState).toHaveBeenCalledTimes(5);
  expect(replaceState).toHaveBeenCalledWith(null, "", "/leaderboards/123?game=fermi&range=7d");
  expect(assign).not.toHaveBeenCalled();
});

test("public and external destinations use normal navigation", () => {
  const assign = vi.fn();
  vi.stubGlobal("window", { location: { origin: "https://dailytracker.cc", assign } });
  expect(isSignedInPath("/auth")).toBe(false);
  navigateInApp("/auth");
  navigateInApp("https://billing.example/checkout");
  expect(assign).toHaveBeenCalledTimes(2);
});
