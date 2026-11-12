import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { getViewer } from "@/lib/auth";
import { LetterBagGame } from "@/components/letter-bag-game";
import { LetterBagModes } from "@/components/letter-bag-modes";
export const metadata: Metadata = { title: "Daily Letter Bag" };
export default async function LetterBagPage() {
  const viewer = await getViewer();
  return <main><SiteHeader viewer={viewer} /><LetterBagModes current="/daily/letter-bag" /><LetterBagGame saved={!!viewer.profile} /></main>;
}
