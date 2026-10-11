/**
 * Mwezora brand configuration.
 *
 * This is the single source of truth for the public-facing brand identity.
 * Paths are relative to /public and must begin with "/".
 *
 * NOTE: Inline-SVG branding (MwezoraLogo component) does not use these paths
 * at runtime — it embeds the vector paths directly for live CSS-variable-driven
 * accent adaptation.  These paths are used for static contexts: metadata,
 * PWA manifest, and legacy mask-based BrandLogo/BrandLink helpers.
 */
export const brand = {
  name: "Mwezora",
  description: "Discover something wonderful.",
  tagline: "Discover Something Wonderful",
  logo: {
    /** Standalone symbol — SVG using currentColor for mask technique */
    symbol: "/mwezora-symbol.svg",
    /** Symbol using --mwezora-accent CSS variable (for img tag preview only; use MwezoraLogo for live theming) */
    adaptive: "/mwezora-symbol-adaptive.svg",
    /** Full horizontal logo — static, single-color export */
    horizontal: "/mwezora-horizontal.svg",
    /** Adaptive horizontal logo with separate Mwe/zora color groups */
    horizontalAdaptive: "/mwezora-horizontal-adaptive.svg",
    /** Stacked layout — static export */
    stacked: "/mwezora-stacked.svg",
    /** Full outlined wordmark — static export */
    wordmark: "/mwezora-wordmark.svg",
    /** Adaptive wordmark with separate Mwe/zora color groups */
    wordmarkAdaptive: "/mwezora-wordmark-adaptive.svg",
    /** Classic horizontal logo — self-contained static color, suitable for img tags */
    horizontalClassic: "/mwezora-horizontal-classic.svg",
    /** Monochrome bag symbol */
    bagMonochrome: "/mwezora-bag-monochrome.svg",
  },
  appIcons: {
    /** Classic brand accent — use for PWA "any" icons and OG images */
    classic: "/mwezora-app-classic-1024.png",
    /** Dark-mode optimized icon — use for PWA "maskable" */
    dark: "/mwezora-app-dark-1024.png",
    /** Light-mode icon */
    light: "/mwezora-app-light-1024.png",
  },
} as const;
