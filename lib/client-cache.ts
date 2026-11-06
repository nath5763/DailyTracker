"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppData } from "@/components/app-data-provider";

export const CACHE_TTL_MS = 60 * 60 * 1000;
type CacheStorage = "memory" | "session";
type Entry<T> = { value: T; savedAt: number };
const memory = new Map<string, Entry<unknown>>();
const pending = new Map<string, Promise<unknown>>();
const generations = new Map<string, number>();
let sessionEpoch = 0;
const prefix = (userId: string) => `daily-club:v1:${userId}:`;
const cacheKey = (userId: string, path: string) => prefix(userId) + path;

function readEntry<T>(userId: string, path: string, storage: CacheStorage = "session"): Entry<T> | null {
  const key = cacheKey(userId, path);
  let entry = memory.get(key) as Entry<T> | undefined;
  if (!entry && storage === "session" && typeof window !== "undefined") {
    try {
      const stored = window.sessionStorage.getItem(key);
      if (stored) entry = JSON.parse(stored) as Entry<T>;
    } catch { /* Storage may be unavailable. The in-memory cache still works. */ }
  }
  if (!entry) return null;
  if (!Number.isFinite(entry.savedAt) || Date.now() - entry.savedAt >= CACHE_TTL_MS) {
    memory.delete(key);
    if (storage === "session") try { window.sessionStorage.removeItem(key); } catch { /* Storage may be unavailable. */ }
    return null;
  }
  memory.set(key, entry);
  return entry;
}

function writeEntry<T>(userId: string, path: string, value: T, storage: CacheStorage = "session") {
  const key = cacheKey(userId, path);
  const entry = { value, savedAt: Date.now() };
  memory.set(key, entry);
  if (storage === "session") {
    try { window.sessionStorage.setItem(key, JSON.stringify(entry)); } catch { /* Keep the in-memory copy. */ }
  }
}

function invalidateKey(key: string) {
  memory.delete(key);
  generations.set(key, (generations.get(key) ?? 0) + 1);
  pending.delete(key);
  try { window.sessionStorage.removeItem(key); } catch { /* Storage may be unavailable. */ }
}

export function invalidateClientCache(userId: string, paths: string[]) {
  for (const path of paths) {
    invalidateKey(cacheKey(userId, path));
  }
}

export function invalidateClientCachePrefix(userId: string, pathPrefix: string) {
  const keyPrefix = cacheKey(userId, pathPrefix);
  const keys = new Set<string>();
  for (const key of memory.keys()) if (key.startsWith(keyPrefix)) keys.add(key);
  for (const key of pending.keys()) if (key.startsWith(keyPrefix)) keys.add(key);
  try {
    for (let index = window.sessionStorage.length - 1; index >= 0; index--) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith(keyPrefix)) keys.add(key);
    }
  } catch { /* Storage may be unavailable. */ }
  for (const key of keys) invalidateKey(key);
}

export function invalidateLeaderboardCacheForGame(userId: string, gameSlug: string) {
  const userPrefix = prefix(userId);
  const leaderboardPrefix = userPrefix + "/leaderboards/";
  const keys = new Set<string>();
  for (const key of pending.keys()) if (key.startsWith(leaderboardPrefix) && [null, gameSlug].includes(cachedGame(key))) keys.add(key);
  for (const key of memory.keys()) if (key.startsWith(leaderboardPrefix) && [null, gameSlug].includes(cachedGame(key))) keys.add(key);
  for (const key of keys) invalidateKey(key);
}

function cachedGame(key: string) {
  const query = key.split("?", 2)[1];
  return query ? new URLSearchParams(query).get("game") : null;
}

export function leaderboardCachePath(id: string, gameSlug: string | undefined, range: string) {
  const game = gameSlug ? `game=${encodeURIComponent(gameSlug)}&` : "";
  return `/leaderboards/${encodeURIComponent(id)}?${game}range=${encodeURIComponent(range)}`;
}

export function clearClientCache(userId: string) {
  sessionEpoch += 1;
  const userPrefix = prefix(userId);
  for (const key of memory.keys()) if (key.startsWith(userPrefix)) memory.delete(key);
  for (const key of pending.keys()) if (key.startsWith(userPrefix)) pending.delete(key);
  try {
    for (let index = window.sessionStorage.length - 1; index >= 0; index--) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith(userPrefix)) window.sessionStorage.removeItem(key);
    }
  } catch { /* Storage may be unavailable. */ }
}

export function clearAllClientCache() {
  sessionEpoch += 1;
  memory.clear();
  pending.clear();
  try {
    for (let index = window.sessionStorage.length - 1; index >= 0; index--) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith("daily-club:v1:")) window.sessionStorage.removeItem(key);
    }
  } catch { /* Storage may be unavailable. */ }
}

export async function cachedApiGet<T>(userId: string, path: string, force = false,
                                      storage: CacheStorage = "session"): Promise<T> {
  if (!force) {
    const entry = readEntry<T>(userId, path, storage);
    if (entry) return entry.value;
  }
  const key = cacheKey(userId, path);
  const existing = pending.get(key);
  if (existing) return existing as Promise<T>;
  const generation = generations.get(key) ?? 0;
  const epoch = sessionEpoch;
  const request = (async () => {
    const response = await fetch(`/api/v1${path}`, { credentials: "same-origin", headers: { Accept: "application/json" }, cache: "no-store" });
    if (response.status === 401) {
      clearClientCache(userId);
      window.location.assign(new URL("/auth", window.location.origin).toString());
      throw new Error("Your session has expired. Sign in again.");
    }
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new ClientApiError(response.status, body.error ?? "Could not load this page. Try again.");
    }
    const value = await response.json() as T;
    if (generation === (generations.get(key) ?? 0) && epoch === sessionEpoch) writeEntry(userId, path, value, storage);
    return value;
  })();
  pending.set(key, request);
  try { return await request; }
  finally { if (pending.get(key) === request) pending.delete(key); }
}

export class ClientApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "ClientApiError";
  }
}

type CachedState<T> = { path: string; data: T | null; loading: boolean; error: string; errorStatus: number | null };

export function useCachedApi<T>(path: string, options: { storage?: CacheStorage; enabled?: boolean } = {}) {
  const { userId } = useAppData();
  const storage = options.storage ?? "session";
  const [state, setState] = useState<CachedState<T>>({ path, data: null, loading: true, error: "", errorStatus: null });

  useEffect(() => {
    if (options.enabled === false) return;
    let active = true;
    const entry = readEntry<T>(userId, path, storage);
    if (entry) {
      queueMicrotask(() => {
        if (active) setState({ path, data: entry.value, loading: false, error: "", errorStatus: null });
      });
      return () => { active = false; };
    }
    queueMicrotask(() => {
      if (active) setState({ path, data: null, loading: true, error: "", errorStatus: null });
    });
    void cachedApiGet<T>(userId, path, false, storage).then((value) => {
      if (active) setState({ path, data: value, loading: false, error: "", errorStatus: null });
    }).catch((cause: unknown) => {
      if (active) setState({ path, data: null, loading: false,
        error: cause instanceof Error ? cause.message : "Could not load this page.",
        errorStatus: cause instanceof ClientApiError ? cause.status : null });
    });
    return () => { active = false; };
  }, [userId, path, storage, options.enabled]);

  const refresh = useCallback(async () => {
    setState({ path, data: null, loading: true, error: "", errorStatus: null });
    try {
      const value = await cachedApiGet<T>(userId, path, true, storage);
      setState({ path, data: value, loading: false, error: "", errorStatus: null });
      return value;
    } catch (cause) {
      setState({ path, data: null, loading: false,
        error: cause instanceof Error ? cause.message : "Could not load this page.",
        errorStatus: cause instanceof ClientApiError ? cause.status : null });
      throw cause;
    }
  }, [userId, path, storage]);

  const fresh = options.enabled === false ? null : readEntry<T>(userId, path, storage);
  if (fresh) return { path, data: fresh.value, loading: false, error: "", errorStatus: null, refresh };
  return state.path === path ? { ...state, refresh } : {
    path, data: null, loading: true, error: "", errorStatus: null, refresh,
  };
}
