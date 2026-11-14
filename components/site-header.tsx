import { Logo } from "@/components/logo";
import { getViewer } from "@/lib/auth";
import { HeaderNavigation } from "@/components/header-navigation";

type Viewer = Awaited<ReturnType<typeof getViewer>>;

export async function SiteHeader({ viewer }: { viewer?: Viewer } = {}) {
  const { user, profile } = viewer ?? await getViewer();
  return (
    <header className="site-header shell">
      <Logo />
      <HeaderNavigation user={Boolean(user)} profile={profile ? { shareId: profile.shareId, displayName: profile.displayName, avatarColor: profile.avatarColor } : null} />
    </header>
  );
}

