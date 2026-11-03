"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function RefreshLeaderboardButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <button className="button button-ghost" type="button" disabled={pending}
    onClick={() => startTransition(() => router.refresh())}>
    {pending ? "Refreshing…" : "Refresh leaderboard"}
  </button>;
}
