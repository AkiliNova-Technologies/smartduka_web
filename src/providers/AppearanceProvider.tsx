"use client";
/* eslint-disable react-hooks/refs, react-hooks/set-state-in-effect -- refs and synchronous resets guard account transitions before async responses settle. */

import * as React from "react";
import { useAuth } from "@/providers/AuthProvider";
import {
  DEFAULT_APPEARANCE,
  normalizeAppearance,
  type AppearancePreferences,
  type AccentPreset,
  type ThemeMode,
} from "@/lib/appearance";

const GUEST_STORAGE_KEY = "smartduka_guest_appearance";
const accountCache = new Map<string, AppearancePreferences>();

async function appearanceError(response: Response): Promise<Error> {
  const body = (await response.json().catch(() => null)) as { error?: { message?: unknown } } | null;
  if (response.status === 401) return new Error("Your session has expired. Sign in again to save appearance preferences.");
  if (response.status === 403) return new Error("Appearance preferences are unavailable for this account.");
  if (response.status >= 500) return new Error("Appearance preferences are temporarily unavailable. Please try again.");
  return new Error(typeof body?.error?.message === "string" ? body.error.message : "Could not save your appearance preferences.");
}

type AppearanceContextValue = AppearancePreferences & {
  theme: "light" | "dark";
  mounted: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
  setAppearance: (updates: Partial<AppearancePreferences>) => void;
  setThemeMode: (themeMode: ThemeMode) => void;
  setAccentColor: (accentColor: AccentPreset) => void;
  resetAccent: () => void;
  retry: () => void;
};

const AppearanceContext = React.createContext<AppearanceContextValue | undefined>(undefined);

function readGuestAppearance(): AppearancePreferences {
  try {
    return normalizeAppearance(JSON.parse(localStorage.getItem(GUEST_STORAGE_KEY) ?? "null"));
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

function writeGuestAppearance(value: AppearancePreferences) {
  try {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Appearance remains usable when storage is blocked or full.
  }
}

function resolvedTheme(mode: ThemeMode): "light" | "dark" {
  if (mode !== "system") return mode;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const { uid, sessionReady, sessionRevision } = useAuth();
  const [appearance, setAppearanceState] = React.useState<AppearancePreferences>(DEFAULT_APPEARANCE);
  const [mounted, setMounted] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const generation = React.useRef(0);
  const controller = React.useRef<AbortController | null>(null);
  const writeQueue = React.useRef(Promise.resolve());
  const activeUser = React.useRef<string | null>(null);
  const appearanceRef = React.useRef(appearance);
  appearanceRef.current = appearance;

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!mounted) return;
    const theme = resolvedTheme(appearance.themeMode);
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.dataset.accent = appearance.accentColor;
  }, [appearance, mounted]);

  React.useLayoutEffect(() => {
    if (!mounted) return;
    const nextGeneration = ++generation.current;
    controller.current?.abort();
    setError(null);
    activeUser.current = uid;

    if (!uid) {
      setLoading(false);
      setAppearanceState(readGuestAppearance());
      return;
    }

    const cached = accountCache.get(uid) ?? DEFAULT_APPEARANCE;
    setAppearanceState(cached);
    if (!sessionReady) {
      setLoading(true);
      return;
    }

    const request = new AbortController();
    controller.current = request;
    setLoading(!accountCache.has(uid));
    void fetch("/api/v1/preferences/appearance", {
      cache: "no-store",
      signal: request.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw await appearanceError(response);
        const body = (await response.json()) as { data?: unknown };
        return normalizeAppearance(body.data);
      })
      .then((next) => {
        if (generation.current !== nextGeneration || activeUser.current !== uid) return;
        accountCache.set(uid, next);
        setAppearanceState(next);
      })
      .catch((cause: unknown) => {
        if (request.signal.aborted || generation.current !== nextGeneration) return;
        setError(cause instanceof Error ? cause.message : "Unable to load appearance preferences.");
      })
      .finally(() => {
        if (generation.current === nextGeneration) setLoading(false);
      });
  }, [mounted, sessionReady, sessionRevision, uid]);

  const persist = React.useCallback((updates: Partial<AppearancePreferences>) => {
    const userId = activeUser.current;
    const next = normalizeAppearance({ ...appearanceRef.current, ...updates });
    setAppearanceState(next);
    setError(null);

    if (!userId) {
      writeGuestAppearance(next);
      return;
    }
    if (!sessionReady) {
      setError("Your session is still being restored. Retry once it is ready to save this choice.");
      return;
    }

    // A server read started before this immediate preview must not overwrite it.
    controller.current?.abort();
    accountCache.set(userId, next);
    const requestGeneration = generation.current;
    writeQueue.current = writeQueue.current
      .catch(() => undefined)
      .then(async () => {
        if (activeUser.current !== userId || generation.current !== requestGeneration) return;
        setSaving(true);
        const response = await fetch("/api/v1/preferences/appearance", {
          method: "PATCH",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
        if (!response.ok) throw await appearanceError(response);
        const body = (await response.json()) as { data?: unknown };
        const saved = normalizeAppearance(body.data);
        if (activeUser.current !== userId || generation.current !== requestGeneration) return;
        accountCache.set(userId, saved);
        if (appearanceRef.current.themeMode === next.themeMode && appearanceRef.current.accentColor === next.accentColor) {
          setAppearanceState(saved);
        }
      })
      .catch((cause: unknown) => {
        if (activeUser.current === userId && generation.current === requestGeneration) {
          setError(cause instanceof TypeError ? "Network unavailable. Check your connection and try again." : cause instanceof Error ? cause.message : "Could not save your appearance preferences.");
        }
      })
      .finally(() => {
        if (activeUser.current === userId && generation.current === requestGeneration) setSaving(false);
      });
  }, [sessionReady]);

  const value = React.useMemo<AppearanceContextValue>(() => ({
    ...appearance,
    theme: mounted ? resolvedTheme(appearance.themeMode) : "light",
    mounted,
    loading,
    saving,
    error,
    setAppearance: persist,
    setThemeMode: (themeMode) => persist({ themeMode }),
    setAccentColor: (accentColor) => persist({ accentColor }),
    resetAccent: () => persist({ accentColor: "classic" }),
    retry: () => persist(appearanceRef.current),
  }), [appearance, error, loading, mounted, persist, saving]);

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const context = React.useContext(AppearanceContext);
  if (!context) throw new Error("useAppearance must be used within an AppearanceProvider");
  return context;
}
