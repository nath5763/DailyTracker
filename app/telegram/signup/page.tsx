import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { TelegramSignupButton } from "@/components/telegram-signup-button";
import { getViewer } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

export const metadata = { title: "Finish Telegram signup" };
export const dynamic = "force-dynamic";

export default async function TelegramSignupPage({ searchParams }: {
  searchParams: Promise<{ intent?: string }>;
}) {
  const { intent } = await searchParams;
  const viewer = await getViewer();
  let valid = false;
  if (intent && /^[A-Za-z0-9_-]{43}$/.test(intent)) {
    try { valid = (await apiFetch<{ valid: boolean }>(`/telegram/signup-intents/${intent}`)).valid; }
    catch { valid = false; }
  }
  const next = valid ? `/telegram/signup?intent=${intent}` : "";
  return <main className="app-shell"><SiteHeader viewer={viewer} /><section className="page shell">
    <div className="page-heading"><div><p className="section-number">TELEGRAM SIGNUP</p><h1>Finish your account</h1></div></div>
    <div className="card" style={{ maxWidth: 560 }}>
      {!valid ? <p>This signup link is invalid, expired, or already used. Run /signup in Telegram again.</p> : null}
      {valid && !viewer.user ? <div className="form-stack"><p>Create an account or sign in, then confirm your Telegram identity in the bot&apos;s private chat.</p>
        <Link className="button" href={"/auth/register?next=" + encodeURIComponent(next)}>Create account</Link>
        <Link href={"/auth?next=" + encodeURIComponent(next)}>Already have an account? Sign in</Link></div> : null}
      {valid && viewer.user && !viewer.profile ? <div className="form-stack"><p>Set up your profile to continue.</p>
        <Link className="button" href={"/onboarding?next=" + encodeURIComponent(next)}>Set up profile</Link></div> : null}
      {valid && viewer.profile ? <><p>Confirm this account from the Telegram identity that ran /signup. You will join the original group&apos;s leaderboard if it is still connected and accessible.</p><TelegramSignupButton intent={intent!} /></> : null}
    </div>
  </section></main>;
}
