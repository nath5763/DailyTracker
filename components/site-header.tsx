import Link from "next/link";
import { Logo } from "@/components/logo";
import { getViewer } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

type Viewer = Awaited<ReturnType<typeof getViewer>>;

export async function SiteHeader({ viewer }: { viewer?: Viewer } = {}) {
  const { user, profile } = viewer ?? await getViewer();
  return (
    <header className="site-header shell">
      <Logo />
      <nav aria-label="Main navigation">
        {profile ? (
          <>
            <Link href="/dashboard">Overview</Link>
            <Link href="/submit">Add score</Link>
            <Link href="/leaderboards">Leaderboards</Link>
            <Link className="avatar-link" href={`/profile/${profile.shareId}`} title={profile.displayName}>
              <span className="avatar small" style={{ background: profile.avatarColor }}>
                {profile.displayName.slice(0, 1).toUpperCase()}
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
