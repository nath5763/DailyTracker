import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getViewer } from "@/lib/auth";
import { completeOnboarding } from "./actions";

export const metadata = { title: "Set up your profile" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { user, profile } = await getViewer();
  if (!user) redirect("/auth");
  if (profile) redirect("/dashboard");
  const params = await searchParams;

  return (
    <main className="app-shell">
      <SiteHeader />
      <section className="page shell">
        <div className="page-heading"><div><p className="section-number">ONE LAST THING</p><h1>Name your player.</h1></div><p>This is what friends will see on every leaderboard. It does not have to be unique.</p></div>
        <div className="card" style={{ maxWidth: 560 }}>
          <form className="form-stack" action={completeOnboarding}>
            <div className="field"><label htmlFor="displayName">Display name</label><input id="displayName" name="displayName" minLength={2} maxLength={32} required autoFocus /></div>
            <div className="field"><label htmlFor="avatarColor">Player color</label><select id="avatarColor" name="avatarColor" defaultValue="#dfff4f"><option value="#dfff4f">Electric lime</option><option value="#ff8db6">Club pink</option><option value="#a8c7ff">Sky blue</option><option value="#ffba6b">Tangerine</option><option value="#bba7ff">Soft violet</option></select></div>
            {params.error ? <div className="form-message error">Could not create your profile. Try a different display name.</div> : null}
            <button className="button" type="submit">Enter the club <span>→</span></button>
          </form>
        </div>
      </section>
    </main>
  );
}
