"use client";

import { Check } from "lucide-react";
import { useAppearance } from "@/providers/AppearanceProvider";
import {
  ACCENT_LABELS,
  ACCENT_PRESETS,
  type ThemeMode,
} from "@/lib/appearance";
import { PersonalitySettings } from "@/components/settings/PersonalitySettings";

export function AppearanceSettings() {
  const {
    accentColor,
    error,
    mounted,
    resetAccent,
    retry,
    saving,
    setAccentColor,
    setThemeMode,
    themeMode,
  } = useAppearance();
  return (
    <div className="mt-4 w-full max-w-4xl rounded-xl border bg-card p-5">
      <p className="text-sm font-medium">Theme</p>
      <div
        className="mt-3 inline-grid grid-cols-3 rounded-full border p-1"
        role="group"
        aria-label="Theme mode">
        {(["system", "light", "dark"] as ThemeMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={mounted && themeMode === mode}
            onClick={() => setThemeMode(mode)}
            className={`h-10 rounded-full px-4 text-sm font-medium capitalize focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${mounted && themeMode === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {mode}
          </button>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Accent colour</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose a curated, accessible accent.
          </p>
        </div>
        <button
          type="button"
          onClick={resetAccent}
          disabled={accentColor === "classic" || saving}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50">
          Reset to Classic
        </button>
      </div>
      <div
        className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"
        role="radiogroup"
        aria-label="Accent colour">
        {ACCENT_PRESETS.map((accent) => {
          const selected = accentColor === accent;
          return (
            <button
              key={accent}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setAccentColor(accent)}
              className="flex items-center gap-2 rounded-xl border p-3 text-left text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              data-accent-swatch={accent}>
              <span className="accent-swatch" aria-hidden="true" />
              {ACCENT_LABELS[accent]}
              {selected && (
                <Check className="ml-auto size-4" aria-label="Selected" />
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-6 rounded-xl border bg-muted/40 p-4">
        <p className="text-xs font-medium text-muted-foreground">Preview</p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <button
            type="button"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Primary button
          </button>
          <a
            href="#appearance-preview"
            className="text-sm font-medium text-primary underline underline-offset-4">
            Example link
          </a>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Selected chip
          </span>
        </div>
      </div>
      <PersonalitySettings />
      <div
        className="mt-3 min-h-5 text-xs text-muted-foreground"
        aria-live="polite">
        {error
          ? <span className="flex flex-wrap items-center gap-2">{error} <button type="button" onClick={retry} disabled={saving} className="font-medium text-primary underline underline-offset-4 disabled:opacity-50">Retry</button></span>
          : saving
            ? "Saving appearance…"
            : ""}
      </div>
    </div>
  );
}
