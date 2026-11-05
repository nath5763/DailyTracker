import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { getViewer } from "@/lib/auth";
import { discordSignupNext } from "@/lib/discord-signup";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const params = await searchParams;
  const next = discordSignupNext(params.next) ?? (params.next === "/pricing" ? "/pricing" : "/dashboard");
  const { user, profile } = await getViewer();
  if (profile) redirect(next);
  if (user) redirect("/onboarding?next=" + encodeURIComponent(next));
  return <AuthShell title="Welcome back." description="Sign in with your email address and password.">
    {params.error ? <div className="form-message error">That verification link is invalid or has expired. Request a new one from the sign-in form.</div> : null}
    <AuthForm next={next} />
  </AuthShell>;
}
