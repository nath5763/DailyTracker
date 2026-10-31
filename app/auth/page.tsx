import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/logo";
import { getViewer } from "@/lib/auth";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { user, profile } = await getViewer();
  if (profile) redirect("/dashboard");
  if (user) redirect("/onboarding");
  const params = await searchParams;
  return <main className="auth-page">
    <section className="auth-art"><Logo /><h1>Your crew.<br />Your scores.<br /><em>Every day.</em></h1><p>Private leaderboards for the little games that become big rivalries.</p></section>
    <section className="auth-form-wrap"><div className="auth-card"><h2>Welcome in.</h2><p>No password to forget. We’ll send a secure sign-in link straight to your inbox.</p>
      {params.error ? <div className="form-message error">That sign-in link is invalid or has expired. Request a new one.</div> : null}
      <AuthForm /><hr className="divider" /><p className="privacy-note">By continuing, you agree to keep the leaderboard friendly and your scores honest. See our <a href="/privacy">Privacy Policy</a>.</p>
    </div></section>
  </main>;
}
