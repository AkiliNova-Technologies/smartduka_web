"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
type Theme = "light" | "dark";
const emptySubscribe = () => () => {};
function storedTheme(): Theme {
  const saved = localStorage.getItem("smartduka_theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
export function useTheme() {
  const systemTheme = useSyncExternalStore(emptySubscribe, storedTheme, () => "light" as Theme);
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [override, setOverride] = useState<Theme | null>(null);
  const theme = override ?? systemTheme;
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    if (override) localStorage.setItem("smartduka_theme", override);
  }, [mounted, override, theme]);
  const setTheme = (next: Theme) => setOverride(next);
  return { theme, isDark: theme === "dark", toggleTheme: () => setTheme(theme === "light" ? "dark" : "light"), setTheme, mounted };
}
