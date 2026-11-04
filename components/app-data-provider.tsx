"use client";

import { createContext, useContext } from "react";
import type { Game } from "@/lib/types";

type AppData = { userId: string; shareId: string; games: Game[] };
const Context = createContext<AppData | null>(null);

export function AppDataProvider({ userId, shareId, games, children }: AppData & { children: React.ReactNode }) {
  return <Context.Provider value={{ userId, shareId, games }}>{children}</Context.Provider>;
}

export function useAppData() {
  const data = useContext(Context);
  if (!data) throw new Error("App data is unavailable.");
  return data;
}
