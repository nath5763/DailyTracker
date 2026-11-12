import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { SiteHeader } from "@/components/site-header";
export const metadata: Metadata = { title: "Daily games" };
export default function DailyPage() {
  return <main><SiteHeader /><section className="shell daily-hub"><p className="section-number">PLAY HERE, EVERY DAY</p><h1>Daily games</h1><p>Come back for a fresh challenge each day.</p><article className="daily-game-card"><Image src="/letter-bag/letter-bag-3x2.png" width={600} height={400} alt="Illustrated letter bag" /><div><h2>Daily Letter Bag</h2><p>Make as many words as you can from thirty letters in 90 seconds.</p><Link className="button" href="/daily/letter-bag">Play Letter Bag →</Link></div></article></section></main>;
}
