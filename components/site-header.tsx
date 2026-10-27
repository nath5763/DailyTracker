import Link from "next/link";
import { Logo } from "@/components/logo";
import { getViewer } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

export async function SiteHeader() {
  const { user, profile } = await getViewer();
  return (
    <header className="site-header shell">
      <Logo />
      <nav aria-label="Main navigation">
        {profile ? (
          <>
            <Link href="/dashboard">Overview</Link>
            <Link href="/submit">Add score</Link>
            <Link href="/leaderboards">Leaderboards</Link>
            <Link className="avatar-link" href={`/profile/${profile.share_id}`} title={profile.display_name}>
              <span className="avatar small" style={{ background: profile.avatar_color }}>
                {profile.display_name.slice(0, 1).toUpperCase()}
              </span>
            </Link>
            <SignOutButton />
          </>
        ) : (
          <Link className="button button-small" href={user ? "/onboarding" : "/auth"}>
            {user ? "Finish setup" : "Sign in"}
          </Link>
        )}
      </nav>
    </header>
  );
}
