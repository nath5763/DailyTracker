import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/logo";
import { SetupNotice } from "@/components/setup-notice";
import { getViewer } from "@/lib/auth";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function AuthPage() {
  const configured = hasSupabaseConfig();
  if (configured) {
    const { user, profile } = await getViewer();
    if (profile) redirect("/dashboard");
    if (user) redirect("/onboarding");
  }

  return (
    <main className="auth-page">
      <section className="auth-art">
        <Logo />
        <h1>Your crew.<br />Your scores.<br /><em>Every day.</em></h1>
        <p>Private leaderboards for the little games that become big rivalries.</p>
      </section>
      <section className="auth-form-wrap">
        <div className="auth-card">
          <h2>Welcome in.</h2>
          <p>No password to forget. We’ll send a secure sign-in link straight to your inbox.</p>
          {!configured ? <SetupNotice /> : <AuthForm />}
          <hr className="divider" />
          <p className="privacy-note">By continuing, you agree to keep the leaderboard friendly and your scores honest.</p>
        </div>
      </section>
    </main>
  );
}
