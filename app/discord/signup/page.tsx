import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { DiscordSignupButton } from "@/components/discord-signup-button";
import { DiscordSymbol } from "@/components/discord-symbol";
import { getViewer } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

export const metadata = { title: "Finish Discord signup" };
export const dynamic = "force-dynamic";

const messages: Record<string, string> = {
  joined: "Your Discord account is linked and you have joined the channel's leaderboard.",
  linked: "Your Discord account is linked. This channel has no connected leaderboard.",
  mapping: "Your account is linked, but the channel's leaderboard changed. Ask its owner to add you.",
  locked: "Your account is linked, but the leaderboard is locked until its owner restores access.",
  "join-failed": "Your account is linked, but joining the leaderboard failed. Ask its owner to add you.",
  identity: "You authorized a different Discord account. Run /signup again from the original Discord account.",
  account: "This Discord account or website profile is already linked to a different account.",
  expired: "This signup link has expired or was already used. Run /signup again.",
  cancelled: "Discord authorization was cancelled. Return to your signup link to try again.",
  failed: "Discord verification could not be completed. Return to your signup link to try again.",
};

export default async function DiscordSignupPage({ searchParams }: {
  searchParams: Promise<{ intent?: string; status?: string }>;
}) {
  const { intent, status } = await searchParams;
  const { user, profile } = await getViewer();
  const valid = intent && /^[A-Za-z0-9_-]{43}$/.test(intent)
    ? (await apiFetch<{ valid: boolean }>(`/discord/signup-intents/${intent}`)).valid : false;
  const next = valid ? `/discord/signup?intent=${intent}` : "";
  return <main className="app-shell"><SiteHeader /><section className="page shell">
    <div className="page-heading"><div><p className="section-number discord-label"><DiscordSymbol />DISCORD SIGNUP</p><h1>Finish your account</h1></div></div>
    <div className="card" style={{ maxWidth: 560 }}>
      {status ? <p role="status">{messages[status] ?? messages.failed}</p> : null}
      {valid && !user ? <div className="form-stack"><p>Create an account or sign in, then verify your Discord identity to finish.</p>
        <Link className="button" href={"/auth/register?next=" + encodeURIComponent(next)}>Create account</Link>
        <Link href={"/auth?next=" + encodeURIComponent(next)}>Already have an account? Sign in</Link></div> : null}
      {valid && user && !profile ? <div className="form-stack"><p>Set up your profile to continue.</p>
        <Link className="button" href={"/onboarding?next=" + encodeURIComponent(next)}>Set up profile</Link></div> : null}
      {valid && profile ? <div className="form-stack"><p>Authorize the same Discord identity that ran /signup. You will join that channel&apos;s leaderboard if it is still connected and accessible.</p>
        <DiscordSignupButton intent={intent!} /></div> : null}
      {!valid && !status ? <p>This signup link is invalid or expired. Run /signup again in Discord.</p> : null}
      {status ? <Link href="/dashboard">Go to dashboard</Link> : null}
    </div>
  </section></main>;
}
