import { AppDataProvider } from "@/components/app-data-provider";
import { SiteHeader } from "@/components/site-header";
import { apiFetch } from "@/lib/api";
import { requireViewer } from "@/lib/auth";
import type { Game } from "@/lib/types";
import { SignedInApp } from "@/components/signed-in-app";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer();
  const games = await apiFetch<Game[]>("/games", { cache: "force-cache", next: { revalidate: 3600 } });
  void children;
  return <AppDataProvider userId={viewer.user.id} shareId={viewer.profile.shareId} games={games}>
    <SignedInApp header={<SiteHeader viewer={viewer} />} />
  </AppDataProvider>;
}
