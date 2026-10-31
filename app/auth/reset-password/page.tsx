import { ResetPasswordForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export const metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <AuthShell title="Choose a new password." description="Your reset link can be used once and expires after 30 minutes."><ResetPasswordForm token={token} /></AuthShell>;
}
