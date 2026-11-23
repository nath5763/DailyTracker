import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { getViewer } from "@/lib/auth";
import { SlipOutExperience } from "@/components/slipout-experience";

export const metadata: Metadata = { title: "How to Play SlipOut" };

export default async function SlipOutHowToPlayPage() {
  const viewer = await getViewer();
  return <main><SiteHeader viewer={viewer} /><SlipOutExperience signedIn={!!viewer.profile} userId={viewer.profile?.userId} initialMode="how-to-play" /></main>;
}
