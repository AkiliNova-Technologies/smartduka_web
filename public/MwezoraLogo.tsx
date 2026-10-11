"use client";

import { useId } from "react";
import type { CSSProperties } from "react";

type Props = {
  className?: string;
  size?: number;
  variant?: "full" | "symbol";
  /** Uses existing theme's resolved CSS color token, not a fixed hex. */
  style?: CSSProperties;
};

/** Inline SVG ensures accent CSS variables respond immediately to theme changes. */
export function MwezoraLogo({ className, size = 32, variant = "full", style }: Props) {
  const maskId = useId().replace(/:/g, "");
  const accent = "var(--mwezora-logo-accent, var(--primary))";
  const foreground = "var(--mwezora-logo-foreground, currentColor)";
  const symbol = (
    <svg aria-hidden="true" viewBox="0 0 100 100" width={size} height={size} style={{ flexShrink: 0 }}>
      <defs><mask id={maskId}><rect width="100" height="100" fill="white"/><path d="M14 42 C24 65 45 65 64 71 C75 75 81 83 84 92 L65 94 C57 83 50 80 38 76 C24 71 17 60 14 42 Z" fill="black"/></mask></defs>
      <path d="M33 36 C33 21 39 11 49 11 C60 11 67 21 67 36" stroke={accent} strokeWidth="7.5" strokeLinecap="round" fill="none"/>
      <path d="M18 34 C15 34 13 37 12.5 41 L8.8 84 C8.2 90 12 94 18 94 H80 C86 94 90 90 89.2 84 L85.5 41 C85 37 83 34 79 34 Z M20 47 C30 60 45 60 60 67 C70 72 77 79 80 88 L69 88 C63 79 51 76 39 72 C27 68 23 58 20 47 Z" fill={accent} fillRule="evenodd"/>
    </svg>
  );
  if (variant === "symbol") return <span className={className} style={{ display: "inline-flex", ...style }} role="img" aria-label="Mwezora">{symbol}</span>;
  return (
    <span className={className} style={{ display: "inline-flex", gap: "0.35em", alignItems: "center", whiteSpace: "nowrap", ...style }} role="img" aria-label="Mwezora">
      {symbol}
      <span aria-hidden="true" style={{ fontFamily: '"GFS Didot", "Didot", "Bodoni MT", Georgia, serif', fontSize: size * 1.14, lineHeight: 1, letterSpacing: "-0.035em", color: foreground }}>
        Mwe<span style={{ color: accent }}>zora</span>
      </span>
    </span>
  );
}
