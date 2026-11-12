import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { LetterBagModes } from "@/components/letter-bag-modes";
import { LetterBagVariant } from "@/components/letter-bag-variant";

export const metadata: Metadata = { title: "Letter Bag: Take Your Time" };

export default function UntimedLetterBagPage() {
  return <main><SiteHeader /><LetterBagModes current="/daily/letter-bag/untimed" /><LetterBagVariant mode="untimed" /></main>;
}
