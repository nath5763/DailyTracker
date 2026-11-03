import "server-only";

import { cookies } from "next/headers";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

type ApiRequestInit = RequestInit & { next?: { revalidate?: number } };

export async function apiFetch<T>(path: string, init?: ApiRequestInit): Promise<T> {
  const baseUrl = (process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8080").replace(/\/$/, "");
  const cookieStore = await cookies();
  const session = cookieStore.get("daily_tracker_session");
  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    ...init,
    cache: init?.cache ?? "no-store",
    headers: { Accept: "application/json", Cookie: session ? `${session.name}=${session.value}` : "", ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "The backend request failed.", code: "BACKEND_ERROR" }));
    throw new ApiError(response.status, body.code ?? "BACKEND_ERROR", body.error ?? "The backend request failed.");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
