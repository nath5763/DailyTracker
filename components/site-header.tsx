import { AppLink } from "@/components/app-link";
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
        <AppLink className="nav-games" href="/games">Games</AppLink>
        <AppLink className="nav-pricing" href="/pricing">Pricing</AppLink>
        {profile ? (
          <>
            <AppLink href="/dashboard">Overview</AppLink>
            <AppLink href="/submit">Add score</AppLink>
            <AppLink href="/leaderboards">Leaderboards</AppLink>
            <AppLink className="avatar-link" href={`/profile/${profile.shareId}`} title="Your profile and subscription" aria-label="Your profile and subscription">
              <span>Profile</span>
              <span className="avatar small" style={{ background: profile.avatarColor }}>
                {profile.displayName.slice(0, 1).toUpperCase()}
              </span>
            </AppLink>
            <SignOutButton />
          </>
        ) : (
          <AppLink className="button button-small" href={user ? "/onboarding" : "/auth"}>
            {user ? "Finish setup" : "Sign in"}
          </AppLink>
        )}
      </nav>
    </header>
  );
}

