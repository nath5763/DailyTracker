import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { getViewer } from "@/lib/auth";
import { SlipOutLevels } from "@/components/slipout-levels";

export const metadata: Metadata = { title: "SlipOut Levels" };
export default async function LevelsPage() {
  const viewer = await getViewer();
  return <main><SiteHeader viewer={viewer} /><SlipOutLevels signedIn={!!viewer.profile} /></main>;
}
