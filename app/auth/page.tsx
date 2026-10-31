import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { getViewer } from "@/lib/auth";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { user, profile } = await getViewer();
  if (profile) redirect("/dashboard");
  if (user) redirect("/onboarding");
  const params = await searchParams;
  return <AuthShell title="Welcome back." description="Sign in with your email address and password.">
    {params.error ? <div className="form-message error">That verification link is invalid or has expired. Request a new one from the sign-in form.</div> : null}
    <AuthForm />
  </AuthShell>;
}
