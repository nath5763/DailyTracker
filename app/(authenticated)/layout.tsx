import { AppDataProvider } from "@/components/app-data-provider";
import { SiteHeader } from "@/components/site-header";
import { apiFetch } from "@/lib/api";
import { requireViewer } from "@/lib/auth";
import type { Game } from "@/lib/types";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer();
  const games = await apiFetch<Game[]>("/games", { cache: "force-cache", next: { revalidate: 3600 } });
  return <AppDataProvider userId={viewer.user.id} games={games}>
    <main className="app-shell"><SiteHeader viewer={viewer} />{children}</main>
  </AppDataProvider>;
}
