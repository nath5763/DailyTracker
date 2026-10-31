"use client";

import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  return <button className="text-button" type="button" onClick={async () => { await fetch("/api/v1/auth/logout", { method: "POST", credentials: "same-origin" }); router.push("/"); router.refresh(); }}>Sign out</button>;
}
