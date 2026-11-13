import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { getViewer } from "@/lib/auth";
import { SlipOutGame } from "@/components/slipout-game";

export const metadata: Metadata = { title: "SlipOut" };

export default async function SlipOutPage() {
  const viewer = await getViewer();
  return <main><SiteHeader viewer={viewer} /><SlipOutGame signedIn={!!viewer.profile} /></main>;
}
