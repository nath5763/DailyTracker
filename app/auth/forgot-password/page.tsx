import { ForgotPasswordForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export const metadata = { title: "Reset password" };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email = "" } = await searchParams;
  return <AuthShell title="Reset your password" description="We’ll email a one-time reset link if the account exists."><ForgotPasswordForm initialEmail={email} /></AuthShell>;
}
