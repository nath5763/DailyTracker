import { redirect } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import type { Me, Profile } from "@/lib/types";

export async function getViewer() {
  try {
    const viewer = await apiFetch<Me>("/me");
    return { user: viewer.user, profile: viewer.profile, darkMode: viewer.darkMode };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return { user: null, profile: null, darkMode: false };
    throw error;
  }
}

export async function requireViewer() {
  const viewer = await getViewer();
  if (!viewer.user) redirect("/auth");
  if (!viewer.profile) redirect("/onboarding");
  return viewer as typeof viewer & { user: NonNullable<typeof viewer.user>; profile: Profile };
}
