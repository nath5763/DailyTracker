"use client";

import { ScoreComposer } from "@/components/score-composer";
import { useAppData } from "@/components/app-data-provider";

export function SubmitView() {
  const { games } = useAppData();
  return <section className="page shell">
    <div className="page-heading"><div><p className="section-number">NEW RESULT</p><h1>Paste. Check. Lock.</h1></div><p>Your saved score is permanent, so you’ll always get a chance to verify the puzzle and number first.</p></div>
    <ScoreComposer games={games} />
  </section>;
}
