export const ACCENT_PRESETS = [
  "classic",
  "rose",
  "berry",
  "plum",
  "violet",
  "emerald",
  "teal",
  "coral",
] as const;

export const THEME_MODES = ["system", "light", "dark"] as const;

export type AccentPreset = (typeof ACCENT_PRESETS)[number];
export type ThemeMode = (typeof THEME_MODES)[number];

export type AppearancePreferences = {
  themeMode: ThemeMode;
  accentColor: AccentPreset;
};

export const DEFAULT_APPEARANCE: AppearancePreferences = {
  themeMode: "system",
  accentColor: "classic",
};

export const ACCENT_LABELS: Record<AccentPreset, string> = {
  classic: "Classic",
  rose: "Rose",
  berry: "Berry",
  plum: "Plum",
  violet: "Violet",
  emerald: "Emerald",
  teal: "Teal",
  coral: "Coral",
};

export function isAccentPreset(value: unknown): value is AccentPreset {
  return typeof value === "string" && (ACCENT_PRESETS as readonly string[]).includes(value);
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === "string" && (THEME_MODES as readonly string[]).includes(value);
}

export function normalizeAppearance(value: unknown): AppearancePreferences {
  if (!value || typeof value !== "object") return DEFAULT_APPEARANCE;
  const appearance = value as Partial<AppearancePreferences>;
  return {
    themeMode: isThemeMode(appearance.themeMode) ? appearance.themeMode : DEFAULT_APPEARANCE.themeMode,
    accentColor: isAccentPreset(appearance.accentColor) ? appearance.accentColor : DEFAULT_APPEARANCE.accentColor,
  };
}
