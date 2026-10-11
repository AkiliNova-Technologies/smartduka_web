/**
 * brand.tsx — Mwezora brand component library.
 *
 * Primary export for live-theme-reactive branding: MwezoraLogoLink.
 * Also re-exports legacy BrandLogo / BrandLink for backwards compat
 * with tests and any callers not yet migrated.
 *
 * COLOR ARCHITECTURE
 * --mwezora-logo-foreground  "Mwe"          (inherits --foreground)
 * --mwezora-logo-accent      bag + "zora"   (inherits --primary)
 *
 * Both cascade from globals.css.  No JS needed.
 */

import type { CSSProperties } from "react";
import Link from "next/link";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";
import {
  MwezoraLogo,
  MwezoraLogoLink,
  type MwezoraLogoProps,
  type MwezoraLogoLinkProps,
} from "@/components/brand/MwezoraLogo";

// ─── Re-export MwezoraLogo family ────────────────────────────────────────────

export { MwezoraLogo, MwezoraLogoLink };
export type { MwezoraLogoProps, MwezoraLogoLinkProps };

// ─── Legacy helpers (mask-based, single-colour) ───────────────────────────────
//
// The mask technique colours the entire shape in a single `bg-current` /
// `text-foreground` tint.  It works when a single-colour treatment is
// acceptable (e.g. a monochrome sidebar icon or a simple decorative mark)
// but does NOT provide separate "Mwe" / "zora" colours.
//
// These exports are preserved for:
//   • The mwezora-brand-contract test assertions
//   • Any component that imports them directly
//
// New code should prefer <MwezoraLogoLink> or <MwezoraLogo>.

type BrandImageProps = {
  className?: string;
  decorative?: boolean;
  label?: string;
};

function maskStyle(src: string): CSSProperties {
  return {
    WebkitMaskImage: `url(${src})`,
    maskImage: `url(${src})`,
    WebkitMaskPosition: "center",
    maskPosition: "center",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskSize: "contain",
    maskSize: "contain",
  };
}

function accessibility(decorative: boolean, label: string) {
  return decorative
    ? { "aria-hidden": true as const }
    : { role: "img" as const, "aria-label": label };
}

export function BrandSymbol({
  className,
  decorative = false,
  label = `${brand.name} symbol`,
}: BrandImageProps) {
  return (
    <span
      {...accessibility(decorative, label)}
      className={cn("inline-block aspect-square shrink-0 bg-current", className)}
      style={maskStyle(brand.logo.adaptive)}
    />
  );
}

export function BrandWordmark({
  className,
  decorative = false,
  label = brand.name,
}: BrandImageProps) {
  return (
    <span
      {...accessibility(decorative, label)}
      className={cn("inline-block aspect-[510/123] shrink-0 bg-current", className)}
      style={maskStyle(brand.logo.wordmark)}
    />
  );
}

export function BrandLogo({
  className,
  decorative = false,
  label = brand.name,
  orientation = "horizontal",
}: BrandImageProps & { orientation?: "horizontal" | "stacked" | "compact" }) {
  const compact = orientation === "compact";
  const asset = orientation === "stacked" ? brand.logo.stacked : brand.logo.horizontal;
  return (
    <span
      {...accessibility(decorative, label)}
      className={cn(
        "inline-block shrink-0 bg-current",
        compact ? "aspect-square" : orientation === "stacked" ? "aspect-[680/465]" : "aspect-[910/220]",
        className,
      )}
      style={maskStyle(compact ? brand.logo.adaptive : asset)}
    />
  );
}

export function BrandLink({
  id,
  className,
  logoClassName,
  orientation = "horizontal",
}: {
  id?: string;
  className?: string;
  logoClassName?: string;
  orientation?: "horizontal" | "stacked" | "compact";
}) {
  return (
    <Link
      id={id}
      href="/"
      aria-label={`${brand.name} marketplace home`}
      className={cn(
        "inline-flex shrink-0 items-center text-foreground outline-none ring-offset-background focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      <BrandLogo decorative orientation={orientation} className={logoClassName} />
    </Link>
  );
}
