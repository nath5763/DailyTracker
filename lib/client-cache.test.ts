import { afterEach, expect, test, vi } from "vitest";
import { cachedApiGet, invalidateClientCache, leaderboardCachePath } from "./client-cache";

function browserStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() { return values.size; },
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("reuses a user's response for one hour and refetches after expiry", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-03T12:00:00Z"));
  vi.stubGlobal("window", { sessionStorage: browserStorage(), location: { assign: vi.fn() } });
  const fetcher = vi.fn()
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ version: 1 }) })
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ version: 2 }) });
  vi.stubGlobal("fetch", fetcher);

  expect(await cachedApiGet<{ version: number }>("cache-test-user-1", "/dashboard")).toEqual({ version: 1 });
  vi.advanceTimersByTime(59 * 60 * 1000);
  expect(await cachedApiGet<{ version: number }>("cache-test-user-1", "/dashboard")).toEqual({ version: 1 });
  expect(fetcher).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(61 * 1000);
  expect(await cachedApiGet<{ version: number }>("cache-test-user-1", "/dashboard")).toEqual({ version: 2 });
  expect(fetcher).toHaveBeenCalledTimes(2);
});

test("manual refresh and a mutation both bypass cached leaderboard data", async () => {
  vi.stubGlobal("window", { sessionStorage: browserStorage(), location: { assign: vi.fn() } });
  const fetcher = vi.fn()
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ["first"] })
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ["refreshed"] })
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ["changed"] });
  vi.stubGlobal("fetch", fetcher);

  expect(await cachedApiGet<string[]>("cache-test-user-2", "/leaderboards")).toEqual(["first"]);
  expect(await cachedApiGet<string[]>("cache-test-user-2", "/leaderboards", true)).toEqual(["refreshed"]);
  invalidateClientCache("cache-test-user-2", ["/leaderboards"]);
  expect(await cachedApiGet<string[]>("cache-test-user-2", "/leaderboards")).toEqual(["changed"]);
  expect(fetcher).toHaveBeenCalledTimes(3);
});

test("builds explicit and automatic game leaderboard paths", () => {
  expect(leaderboardCachePath("board 1", "fermi", "7d"))
    .toBe("/leaderboards/board%201?game=fermi&range=7d");
  expect(leaderboardCachePath("board 1", undefined, "today"))
    .toBe("/leaderboards/board%201?range=today");
});
