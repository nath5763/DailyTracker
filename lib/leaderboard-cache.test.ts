import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cachedApiGet, clearAllClientCache, invalidateClientCachePrefix, invalidateLeaderboardCacheForGame, leaderboardCachePath } from "./client-cache";

const user = "cache-test-user";
const path = (board: string, game: string, range: string) => leaderboardCachePath(board, game, range);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-04T12:00:00Z"));
  vi.stubGlobal("window", { sessionStorage: { length: 0, removeItem: vi.fn() } });
  clearAllClientCache();
});
afterEach(() => { clearAllClientCache(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("leaderboard memory cache", () => {
  it("keys by board, game, and range and expires one hour after completion", async () => {
    const fetcher = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ call: fetcher.mock.calls.length }) }));
    vi.stubGlobal("fetch", fetcher);
    const keys = [path("a", "fermi", "today"), path("a", "fermi", "7d"), path("a", "krillion", "today"), path("b", "fermi", "today")];
    for (const key of keys) await cachedApiGet(user, key, false, "memory");
    for (const key of keys) await cachedApiGet(user, key, false, "memory");
    expect(fetcher).toHaveBeenCalledTimes(4);
    vi.advanceTimersByTime(60 * 60 * 1000);
    await cachedApiGet(user, keys[0], false, "memory");
    expect(fetcher).toHaveBeenCalledTimes(5);
  });

  it("invalidates one game across boards and one board across games", async () => {
    const fetcher = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ call: fetcher.mock.calls.length }) }));
    vi.stubGlobal("fetch", fetcher);
    const a = path("a", "fermi", "today"), b = path("b", "fermi", "7d"), c = path("a", "krillion", "today");
    for (const key of [a, b, c]) await cachedApiGet(user, key, false, "memory");
    invalidateLeaderboardCacheForGame(user, "fermi");
    for (const key of [a, b, c]) await cachedApiGet(user, key, false, "memory");
    expect(fetcher).toHaveBeenCalledTimes(5);
    invalidateClientCachePrefix(user, "/leaderboards/a?");
    for (const key of [a, b, c]) await cachedApiGet(user, key, false, "memory");
    expect(fetcher).toHaveBeenCalledTimes(7);
  });

  it("shares an in-flight request", async () => {
    let complete!: (value: unknown) => void;
    const fetcher = vi.fn(() => new Promise((resolve) => { complete = resolve; }));
    vi.stubGlobal("fetch", fetcher);
    const key = path("a", "fermi", "all");
    const first = cachedApiGet(user, key, false, "memory");
    const second = cachedApiGet(user, key, false, "memory");
    complete({ ok: true, status: 200, json: async () => ({ value: 1 }) });
    expect(await first).toEqual(await second);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
