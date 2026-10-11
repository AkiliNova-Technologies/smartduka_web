"use client";

import { useAppearance } from "@/providers/AppearanceProvider";

export function useTheme() {
  const { theme, mounted, setThemeMode } = useAppearance();
  return {
    theme,
    isDark: theme === "dark",
    toggleTheme: () => setThemeMode(theme === "light" ? "dark" : "light"),
    setTheme: setThemeMode,
    mounted,
  };
}
