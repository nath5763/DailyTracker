import { fermiAdapter } from "@/lib/games/fermi";

export const gameAdapters = { fermi: fermiAdapter } as const;

export function getGameAdapter(slug: string) {
  return gameAdapters[slug as keyof typeof gameAdapters] ?? null;
}
