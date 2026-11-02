/**
 * Mezora brand configuration.
 *
 * This is the single source of truth for the public-facing brand identity.
 * Paths are relative to /public and must begin with "/".
 *
 * NOTE: Inline-SVG branding (MezoraLogo component) does not use these paths
 * at runtime — it embeds the vector paths directly for live CSS-variable-driven
 * accent adaptation.  These paths are used for static contexts: metadata,
 * PWA manifest, and legacy mask-based BrandLogo/BrandLink helpers.
 */
export const brand = {
  name: "Mezora",
  description: "Discover something wonderful.",
  tagline: "Discover Something Wonderful",
  logo: {
    /** Standalone symbol — SVG using currentColor for mask technique */
    symbol: "/mezora-symbol.svg",
    /** Symbol using --mwezora-accent CSS variable (for img tag preview only; use MezoraLogo for live theming) */
    adaptive: "/mwezora-symbol-adaptive.svg",
    /** Full horizontal logo — static, single-color export */
    horizontal: "/mezora-horizontal-light.svg",
    /** Adaptive horizontal logo with separate Mwe/zora color groups */
    horizontalAdaptive: "/mezora-horizontal-light.svg",
    /** Stacked layout — static export */
    stacked: "/mwezora-stacked.svg",
    /** Full outlined wordmark — static export */
    wordmark: "/mezora-wordmark.svg",
    /** Adaptive wordmark with separate Mwe/zora color groups */
    wordmarkAdaptive: "/mezora-wordmark.svg",
    /** Classic horizontal logo — self-contained static color, suitable for img tags */
    horizontalClassic: "/mezora-horizontal-light.svg",
    /** Monochrome bag symbol */
    bagMonochrome: "/mwezora-bag-monochrome.svg",
  },
  appIcons: {
    /** Classic brand accent — use for PWA "any" icons and OG images */
    classic: "/mezora-app-classic-1024.png",
    /** Dark-mode optimized icon — use for PWA "maskable" */
    dark: "/mezora-app-dark-1024.png",
    /** Light-mode icon */
    light: "/mezora-app-light-1024.png",
    icon192: "/mezora-app-192.png",
    icon512: "/mezora-app-512.png",
    maskable192: "/mezora-app-maskable-192.png",
    maskable512: "/mezora-app-maskable-512.png",
  },
} as const;
