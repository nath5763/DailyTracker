import type { Metadata } from "next";
import { BloomAndBoomGame } from "@/components/bloom-and-boom-game";
import { SiteHeader } from "@/components/site-header";
import { getViewer } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Bloom & Boom",
  description: "A cozy daily garden deduction game. Find every bloom without waking a storm-bug.",
};

export default async function BloomAndBoomPage() {
  const viewer = await getViewer();
  return <main><SiteHeader viewer={viewer} /><BloomAndBoomGame signedIn={!!viewer.profile} userId={viewer.profile?.userId} /></main>;
}
