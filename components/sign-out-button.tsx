"use client";

import { useRouter } from "next/navigation";
import { clearAllClientCache } from "@/lib/client-cache";

export function SignOutButton() {
  const router = useRouter();
  return <button className="text-button" type="button" onClick={async () => { await fetch("/api/v1/auth/logout", { method: "POST", credentials: "same-origin" }); clearAllClientCache(); router.push("/"); router.refresh(); }}>Sign out</button>;
}
