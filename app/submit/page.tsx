import { SiteHeader } from "@/components/site-header";
import { ScoreComposer } from "@/components/score-composer";
import { requireViewer } from "@/lib/auth";

export const metadata = { title: "Add score" };
export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  await requireViewer();
  return (
    <main className="app-shell">
      <SiteHeader />
      <section className="page shell">
        <div className="page-heading"><div><p className="section-number">NEW RESULT</p><h1>Paste. Check. Lock.</h1></div><p>Your saved score is permanent, so you’ll always get a chance to verify the puzzle and number first.</p></div>
        <ScoreComposer />
      </section>
    </main>
  );
}
