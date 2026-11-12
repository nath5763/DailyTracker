import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { getViewer } from "@/lib/auth";
import { LetterBagGame } from "@/components/letter-bag-game";
export const metadata: Metadata = { title: "Daily Letter Bag" };
export default async function LetterBagPage() {
  const viewer = await getViewer();
  return <main><SiteHeader viewer={viewer} /><LetterBagGame saved={!!viewer.profile} /></main>;
}
