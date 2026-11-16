import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { getViewer } from "@/lib/auth";
import { SlipOutExperience } from "@/components/slipout-experience";

export const metadata: Metadata = { title: "SlipOut Levels" };
export default async function LevelsPage() {
  const viewer = await getViewer();
  return <main><SiteHeader viewer={viewer} /><SlipOutExperience signedIn={!!viewer.profile} initialMode="levels" /></main>;
}
