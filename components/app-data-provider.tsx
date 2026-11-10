"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Game } from "@/lib/types";

type AppData = { userId: string; shareId: string; games: Game[]; darkMode: boolean; setDarkMode: (value: boolean) => void };
const Context = createContext<AppData | null>(null);

export function AppDataProvider({ userId, shareId, games, darkMode: savedDarkMode, children }: Omit<AppData, "setDarkMode"> & { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = useState(savedDarkMode);
  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    try {
      localStorage.setItem(`daily-club:theme:${userId}`, darkMode ? "dark" : "light");
      localStorage.setItem("daily-club:theme-user", userId);
    } catch { /* The theme still works when storage is unavailable. */ }
  }, [userId, darkMode]);
  return <Context.Provider value={{ userId, shareId, games, darkMode, setDarkMode }}>{children}</Context.Provider>;
}

export function useAppData() {
  const data = useContext(Context);
  if (!data) throw new Error("App data is unavailable.");
  return data;
}
