import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { OnboardingForm } from "@/components/onboarding-form";
import { getViewer } from "@/lib/auth";

export const metadata = { title: "Set up your profile" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = (await searchParams).next === "/pricing" ? "/pricing" : "/dashboard";
  const { user, profile } = await getViewer();
  if (!user) redirect(next === "/pricing" ? "/auth?next=%2Fpricing" : "/auth");
  if (profile) redirect(next);
  return <main className="app-shell"><SiteHeader /><section className="page shell">
    <div className="page-heading"><div><p className="section-number">ONE LAST THING</p><h1>Name your player.</h1></div><p>This is what friends will see on every leaderboard. It does not have to be unique.</p></div>
    <div className="card" style={{ maxWidth: 560 }}><OnboardingForm next={next} /></div>
  </section></main>;
}
