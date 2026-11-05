"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { invalidateClientCachePrefix } from "@/lib/client-cache";

export function RedeemInvite({ invite, boardId, userId }: { invite: string; boardId: string; userId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    async function join() {
      try {
        const response = await fetch(`/api/v1/invites/${encodeURIComponent(invite)}/redeem`, { method: "POST" });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error ?? "Could not join this leaderboard.");
        }
        if (!cancelled) {
          invalidateClientCachePrefix(userId, "/leaderboards");
          router.replace(`/leaderboards/${boardId}?joined=1`);
          router.refresh();
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not join this leaderboard.");
      }
    }
    void join();
    return () => { cancelled = true; };
  }, [invite, boardId, userId, router, attempt]);
  return <div className="form-stack">{error ? <><p className="form-message error" role="alert">{error} Your account is ready; ask the owner for help or try again.</p>
    <button className="button" type="button" onClick={() => { setError(""); setAttempt(value => value + 1); }}>Try joining again</button>
    <Link href="/dashboard">Go to dashboard</Link></> : <p role="status">Joining leaderboard…</p>}</div>;
}
