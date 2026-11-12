import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { LetterBagModes } from "@/components/letter-bag-modes";
import { LetterBagVariant } from "@/components/letter-bag-variant";

export const metadata: Metadata = { title: "Letter Bag: Endless Draw" };

export default function EndlessLetterBagPage() {
  return <main><SiteHeader /><LetterBagModes current="/daily/letter-bag/endless" /><LetterBagVariant mode="endless" /></main>;
}
