import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { getViewer } from "@/lib/auth";

export const metadata = { title: "Create account" };
export const dynamic = "force-dynamic";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = (await searchParams).next === "/pricing" ? "/pricing" : "/dashboard";
  const { user, profile } = await getViewer();
  if (profile) redirect(next);
  if (user) redirect(next === "/pricing" ? "/onboarding?next=%2Fpricing" : "/onboarding");
  return <AuthShell title="Create your account." description="Use your email as your username. We’ll verify it before your first sign-in."><RegisterForm next={next} /></AuthShell>;
}
