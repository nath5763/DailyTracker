import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { CatalogDirectory } from "@/components/catalog-directory";
import { apiFetch } from "@/lib/api";
import type { CatalogGame } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Games" };

export default async function GamesPage({ searchParams }: {
  searchParams: Promise<{ tracking?: string | string[] }>;
}) {
  const tracking = (await searchParams).tracking;
  const games = await apiFetch<CatalogGame[]>("/catalog/games");
  return <main><SiteHeader /><CatalogDirectory key={tracking === "available" ? "tracked" : "all"} games={games} initialTrackedOnly={tracking === "available"} /></main>;
}
