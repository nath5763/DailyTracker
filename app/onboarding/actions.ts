"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";

const schema = z.object({
  displayName: z.string().trim().min(2).max(32),
  avatarColor: z.enum(["#dfff4f", "#ff8db6", "#a8c7ff", "#ffba6b", "#bba7ff"]),
});

export async function completeOnboarding(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/onboarding?error=validation");
  const supabase = await createServerSupabase();
  if (!supabase) redirect("/onboarding?error=config");
  const { error } = await supabase.rpc("complete_onboarding", {
    display_name_input: parsed.data.displayName,
    avatar_color_input: parsed.data.avatarColor,
  });
  if (error) redirect("/onboarding?error=database");
  redirect("/dashboard");
}
