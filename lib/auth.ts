import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function getViewer() {
  const supabase = await createServerSupabase();
  if (!supabase) return { supabase: null, user: null, profile: null };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { supabase, user: null, profile: null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id,share_id,display_name,avatar_color,created_at")
    .eq("user_id", data.user.id)
    .maybeSingle();
  return { supabase, user: data.user, profile: profile as Profile | null };
}

export async function requireViewer() {
  const viewer = await getViewer();
  if (!viewer.user) redirect("/auth");
  if (!viewer.profile) redirect("/onboarding");
  return viewer as typeof viewer & { user: NonNullable<typeof viewer.user>; profile: Profile };
}
