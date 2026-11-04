"use client";

import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { LocalNavigationProvider } from "@/components/app-link";
import { DashboardView } from "@/components/dashboard-view";
import { LeaderboardsView } from "@/components/leaderboards-view";
import { LeaderboardDetail } from "@/components/leaderboard-detail";
import { ProfileView } from "@/components/profile-view";
import { SubmitView } from "@/components/submit-view";

export function SignedInApp({ header }: { header: React.ReactNode }) {
  return <LocalNavigationProvider><main className="app-shell">{header}<Suspense fallback={null}><CurrentView /></Suspense></main></LocalNavigationProvider>;
}

function CurrentView() {
  const pathname = usePathname();
  const query = useSearchParams();
  useEffect(() => {
    const name = pathname === "/dashboard" ? "Overview" : pathname === "/submit" ? "Add score" :
      pathname.startsWith("/leaderboards") ? "Leaderboards" : "Profile";
    document.title = `${name} · Daily Club`;
  }, [pathname]);
  if (pathname === "/dashboard") return <DashboardView />;
  if (pathname === "/submit") return <SubmitView />;
  if (pathname === "/leaderboards") return <LeaderboardsView checkout={query.get("checkout") ?? undefined} billingReturn={query.get("billing") ?? undefined} />;
  const board = /^\/leaderboards\/([^/]+)$/.exec(pathname);
  if (board) return <LeaderboardDetail id={decodeURIComponent(board[1])} requestedGame={query.get("game") ?? undefined} requestedRange={query.get("range") ?? undefined} />;
  const profile = /^\/profile\/([^/]+)$/.exec(pathname);
  if (profile) return <ProfileView shareId={decodeURIComponent(profile[1])} checkout={query.get("checkout") ?? undefined} billingReturn={query.get("billing") ?? undefined} />;
  return <section className="page shell"><div className="card">Page not found.</div></section>;
}
