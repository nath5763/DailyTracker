"use client";

import { createBrowserSupabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  return <button className="text-button" type="button" onClick={async () => { const supabase = createBrowserSupabase(); await supabase.auth.signOut(); router.push("/"); router.refresh(); }}>Sign out</button>;
}
