"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppData } from "@/components/app-data-provider";

export const CACHE_TTL_MS = 60 * 60 * 1000;
type Entry<T> = { value: T; savedAt: number };
const memory = new Map<string, Entry<unknown>>();
const pending = new Map<string, Promise<unknown>>();
const generations = new Map<string, number>();
let sessionEpoch = 0;
const prefix = (userId: string) => `daily-club:v1:${userId}:`;
const cacheKey = (userId: string, path: string) => prefix(userId) + path;

function readEntry<T>(userId: string, path: string): Entry<T> | null {
  const key = cacheKey(userId, path);
  let entry = memory.get(key) as Entry<T> | undefined;
  if (!entry && typeof window !== "undefined") {
    try {
      const stored = window.sessionStorage.getItem(key);
      if (stored) entry = JSON.parse(stored) as Entry<T>;
    } catch { /* Storage may be unavailable. The in-memory cache still works. */ }
  }
  if (!entry || !Number.isFinite(entry.savedAt) || Date.now() - entry.savedAt >= CACHE_TTL_MS) return null;
  memory.set(key, entry);
  return entry;
}

function writeEntry<T>(userId: string, path: string, value: T) {
  const key = cacheKey(userId, path);
  const entry = { value, savedAt: Date.now() };
  memory.set(key, entry);
  try { window.sessionStorage.setItem(key, JSON.stringify(entry)); } catch { /* Keep the in-memory copy. */ }
}

export function invalidateClientCache(userId: string, paths: string[]) {
  for (const path of paths) {
    const key = cacheKey(userId, path);
    memory.delete(key);
    generations.set(key, (generations.get(key) ?? 0) + 1);
    pending.delete(key);
    try { window.sessionStorage.removeItem(key); } catch { /* Storage may be unavailable. */ }
  }
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

export async function cachedApiGet<T>(userId: string, path: string, force = false): Promise<T> {
  if (!force) {
    const entry = readEntry<T>(userId, path);
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
      throw new Error(body.error ?? "Could not load this page. Try again.");
    }
    const value = await response.json() as T;
    if (generation === (generations.get(key) ?? 0) && epoch === sessionEpoch) writeEntry(userId, path, value);
    return value;
  })();
  pending.set(key, request);
  try { return await request; }
  finally { if (pending.get(key) === request) pending.delete(key); }
}

export function useCachedApi<T>(path: string) {
  const { userId } = useAppData();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const entry = readEntry<T>(userId, path);
    if (entry) {
      queueMicrotask(() => {
        if (active) { setData(entry.value); setLoading(false); }
      });
      return () => { active = false; };
    }
    void cachedApiGet<T>(userId, path).then((value) => {
      if (active) { setData(value); setError(""); setLoading(false); }
    }).catch((cause: unknown) => {
      if (active) { setError(cause instanceof Error ? cause.message : "Could not load this page."); setLoading(false); }
    });
    return () => { active = false; };
  }, [userId, path]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const value = await cachedApiGet<T>(userId, path, true);
      setData(value);
      return value;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load this page.");
      throw cause;
    } finally {
      setLoading(false);
    }
  }, [userId, path]);

  return { data, loading, error, refresh };
}
