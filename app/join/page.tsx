import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { RedeemInvite } from "@/components/redeem-invite";
import { DiscordLinkInstructions } from "@/components/discord-link-instructions";
import { ApiError, apiFetch } from "@/lib/api";
import { getViewer } from "@/lib/auth";
import { leaderboardInviteNext } from "@/lib/leaderboard-invite";

export const metadata = { title: "Join a leaderboard" };
export const dynamic = "force-dynamic";

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const { invite } = await searchParams;
  const next = leaderboardInviteNext(invite ? `/join?invite=${invite}` : undefined);
  const { user, profile } = await getViewer();
  let board: { leaderboardId: string; name: string } | null = null;
  let error = "This invitation is invalid, was revoked, or its leaderboard was deleted. Ask the owner for a new link.";
  if (next) {
    try { board = await apiFetch<{ leaderboardId: string; name: string }>(`/invites/${invite}`); }
    catch (cause) {
      if (cause instanceof ApiError) {
        if (cause.code === "OWNER_SUBSCRIPTION_REQUIRED") error = "This leaderboard is locked until its owner restores access.";
        else if (cause.code === "LEADERBOARD_NOT_FOUND") error = "This leaderboard no longer exists.";
        else if (cause.code === "INVITE_REVOKED") error = "This invitation was revoked. Ask the owner for a new link.";
      }
    }
  }
  return <main className="app-shell"><SiteHeader /><section className="page shell">
    <div className="page-heading"><div><p className="section-number">LEADERBOARD INVITATION</p><h1>{board ? `Join ${board.name}` : "Invitation unavailable"}</h1></div></div>
    <div className="card" style={{ maxWidth: 560 }}>
      {!board ? <p role="alert">{error}</p> : null}
      {board && !user ? <div className="form-stack"><p>Create an account or sign in to join this leaderboard.</p>
        <Link className="button" href={"/auth/register?next=" + encodeURIComponent(next!)}>Create account</Link>
        <Link href={"/auth?next=" + encodeURIComponent(next!)}>Already have an account? Sign in</Link></div> : null}
      {board && user && !profile ? <div className="form-stack"><p>Set up your profile to join.</p>
        <Link className="button" href={"/onboarding?next=" + encodeURIComponent(next!)}>Set up profile</Link></div> : null}
      {board && profile ? <RedeemInvite invite={invite!} boardId={board.leaderboardId} userId={profile.userId} /> : null}
      {!board && user ? <Link href="/dashboard">Go to dashboard</Link> : null}
    </div>
    {board ? <><div className="spacer" /><DiscordLinkInstructions /></> : null}
  </section></main>;
}
