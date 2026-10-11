"use client";

/**
 * MwezoraLogo — Adaptive inline-SVG brand component.
 *
 * Uses CSS custom properties so the shopping-bag symbol and the "zora"
 * wordmark portion immediately reflect the user's selected primary accent
 * color whenever AppearanceProvider updates --primary on :root.
 *
 * Color architecture:
 *   --mwezora-logo-foreground  → "Mwe" letters  (defaults to --foreground)
 *   --mwezora-logo-accent      → bag + "zora"   (defaults to --primary)
 *
 * Both variables are defined via globals.css so they cascade automatically;
 * no React state or effect is needed here.
 *
 * Variants:
 *   horizontal  – [bag] Mwe[zora]  (default)
 *   stacked     – bag above Mwe[zora]
 *   symbol      – bag only
 *   wordmark    – Mwe[zora] text only
 *   monochrome  – entire mark in currentColor
 */

import * as React from "react";
import { useId } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ─── Public API ───────────────────────────────────────────────────────────────

export type MwezoraLogoVariant =
  | "horizontal"
  | "stacked"
  | "symbol"
  | "wordmark"
  | "monochrome";

export type MwezoraLogoSize = "xs" | "sm" | "md" | "lg" | "xl";

export type MwezoraLogoProps = {
  variant?: MwezoraLogoVariant;
  size?: MwezoraLogoSize;
  className?: string;
  /** Accessible label. Defaults to "Mwezora". Pass null to make decorative. */
  label?: string | null;
  /** Show optional tagline beneath the wordmark (stacked only). */
  showTagline?: boolean;
};

// ─── Size map ─────────────────────────────────────────────────────────────────

// Symbol height in pixels for each named size.
const SYMBOL_HEIGHT: Record<MwezoraLogoSize, number> = {
  xs: 20,
  sm: 26,
  md: 32,
  lg: 40,
  xl: 52,
};

// ─── SVG Geometry (sourced from public/mwezora-bag-adaptive.svg) ─────────────
//
// These exact path values match the approved brand asset.  Do not replace with
// generic icon library shapes.

function BagSymbolPaths({
  accent,
  maskId,
}: {
  accent: string;
  maskId: string;
}) {
  return (
    <>
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
          <rect width="100" height="100" fill="white" />
          {/* Inner sweep cut — the flowing diagonal that gives the bag its signature character */}
          <path
            d="M20 47 C30 60 45 60 60 67 C70 72 77 79 80 88 L69 88 C63 79 51 76 39 72 C27 68 23 58 20 47 Z"
            fill="black"
          />
        </mask>
      </defs>
      {/* Handle arch */}
      <path
        d="M33 36 C33 21 39 11 49 11 C60 11 67 21 67 36"
        fill="none"
        stroke={accent}
        strokeWidth="7.5"
        strokeLinecap="round"
      />
      {/* Bag body with inner sweep cut applied via evenodd fill rule */}
      <path
        d="M18 34 C15 34 13 37 12.5 41 L8.8 84 C8.2 90 12 94 18 94 H80 C86 94 90 90 89.2 84 L85.5 41 C85 37 83 34 79 34 Z M20 47 C30 60 45 60 60 67 C70 72 77 79 80 88 L69 88 C63 79 51 76 39 72 C27 68 23 58 20 47 Z"
        fill={accent}
        fillRule="evenodd"
      />
    </>
  );
}

// ─── Wordmark letterforms (sourced from public/mwezora-wordmark-adaptive.svg) ─
//
// Scale and translate values exactly match the supplied SVG exports.
// The wordmark viewBox is 395.72 × 104.  Each letter group uses the
// same transform pattern: translate(x 83) scale(0.096 -0.096).

function WordmarkPaths({
  foreground,
  accent,
  monochrome,
}: {
  foreground: string;
  accent: string;
  monochrome: boolean;
}) {
  const fg = monochrome ? "currentColor" : foreground;
  const ac = monochrome ? "currentColor" : accent;

  return (
    // viewBox matches the wordmark SVG asset
    <svg
      aria-hidden="true"
      viewBox="0 0 395.72 104"
      // Height is controlled by parent; width scales proportionally via SVG aspect ratio
      height="1em"
      style={{ width: "auto", display: "block" }}
      overflow="visible"
    >
      {/* M — foreground */}
      <path
        d="M848 31H755V658H848V689H657L447 169L263 689H66V658H122C140 658 150 650 152 635V117C152 82 143 56 124 40C117 34 95 31 58 31V0H278V31C239 31 217 34 210 41C193 58 185 83 185 117V617L406 10L421 11L663 620V31H570V0H848Z"
        transform="translate(0.000 83.000) scale(0.096000 -0.096000)"
        fill={fg}
      />
      {/* w — foreground */}
      <path
        d="M771 457H588V429H638C650 429 655 425 655 414C655 407 653 398 648 386L543 93L426 468H393L255 93L169 400C168 403 168 406 168 409C168 423 176 429 193 429C199 429 208 429 239 429V457H8V429H40C52 429 69 424 74 407L204 0H255L380 322L494 0H543L698 386C711 415 725 429 745 429H771Z"
        transform="translate(87.456 83.000) scale(0.096000 -0.096000)"
        fill={fg}
      />
      {/* e — foreground */}
      <path
        d="M431 232C432 245 433 257 433 269C433 325 416 370 383 406C348 445 303 464 247 464C179 464 124 438 83 388C43 340 24 283 24 214C24 148 43 94 80 54C120 12 175 -9 246 -9C316 -9 374 20 421 78L408 88C359 57 319 42 289 42C231 42 187 60 157 95C128 127 113 174 113 232ZM345 268C312 266 235 267 114 270C114 321 127 362 151 391C174 418 204 432 243 432C275 432 301 416 320 383C337 354 345 315 345 268Z"
        transform="translate(163.296 83.000) scale(0.096000 -0.096000)"
        fill={fg}
      />
      {/* z — accent */}
      <path
        d="M436 141H409C405 107 399 80 390 58C384 46 372 35 358 35L134 34L421 428V457C354 455 232 455 53 457V326H81C86 359 91 383 95 398C99 414 126 420 143 420L311 419L16 19V-3C205 -1 345 0 436 0Z"
        transform="translate(205.936 83.000) scale(0.096000 -0.096000)"
        fill={ac}
      />
      {/* o — accent */}
      <path
        d="M506 244C506 307 485 360 442 402C400 445 347 467 284 467C129 467 35 368 35 218C35 151 55 96 95 53C136 11 188 -11 249 -10C325 -9 387 15 434 62C482 109 506 170 506 244ZM415 202C415 152 405 111 386 78C363 40 331 22 289 22C232 22 189 48 160 102C137 145 126 197 126 259C126 376 172 434 263 434C307 434 343 411 372 366C400 321 415 267 415 202Z"
        transform="translate(250.192 83.000) scale(0.096000 -0.096000)"
        fill={ac}
      />
      {/* r — accent */}
      <path
        d="M107 50C104 35 96 27 84 27H28V0H271V27H213C200 27 192 35 190 50V276C190 304 199 329 217 350C235 373 256 384 277 384C308 384 330 369 343 340C376 343 393 363 393 400C393 436 368 468 327 468C293 468 262 453 232 423C213 403 199 384 191 365V457H27V429H73C95 429 106 418 107 395V50Z"
        transform="translate(301.648 83.000) scale(0.096000 -0.096000)"
        fill={ac}
      />
      {/* a — accent */}
      <path
        d="M480 28H422C410 28 399 36 399 50V268C399 337 386 388 360 420C334 449 294 464 242 464C211 464 182 459 153 448C109 430 85 401 84 361C83 326 99 309 133 309C148 306 178 320 176 341C173 349 153 362 153 379C154 417 184 436 239 436C272 436 295 420 308 389C317 367 321 332 320 285L222 268C165 258 122 243 93 225C52 199 32 159 32 107C32 70 43 40 67 19C89 -2 117 -12 152 -12C205 -12 261 20 320 82V0H480ZM320 122C289 79 236 44 194 45C153 48 117 78 117 125C117 164 141 206 177 219C218 235 265 245 320 252Z"
        transform="translate(340.720 83.000) scale(0.096000 -0.096000)"
        fill={ac}
      />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MwezoraLogo({
  variant = "horizontal",
  size = "md",
  className,
  label = "Mwezora",
  showTagline = false,
}: MwezoraLogoProps) {
  const maskId = `mwezora-bag-mask-${useId().replace(/:/g, "")}`;
  const symbolHeight = SYMBOL_HEIGHT[size];

  // These CSS variables are set globally in globals.css.
  // They cascade from --primary (accent) and --foreground without any JS.
  const accent = "var(--mwezora-logo-accent, var(--primary))";
  const foreground = "var(--mwezora-logo-foreground, var(--foreground))";

  const accessibilityProps =
    label === null
      ? { "aria-hidden": true as const }
      : { role: "img" as const, "aria-label": label };

  const bagSymbol = (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      width={symbolHeight}
      height={symbolHeight}
      style={{ flexShrink: 0 }}
      overflow="visible"
    >
      <BagSymbolPaths accent={accent} maskId={maskId} />
    </svg>
  );

  const monochrome = variant === "monochrome";

  // The wordmark SVG uses a tall viewBox (104px).  We set its font-size to
  // the desired rendered height so "height: 1em" inside scales correctly.
  const wordmarkStyle: React.CSSProperties = {
    fontSize: symbolHeight,
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
  };

  const wordmark = (
    <span style={wordmarkStyle} aria-hidden="true">
      <WordmarkPaths
        foreground={foreground}
        accent={accent}
        monochrome={monochrome}
      />
    </span>
  );

  if (variant === "symbol") {
    return (
      <span
        {...accessibilityProps}
        className={cn("inline-flex shrink-0 items-center", className)}
      >
        {monochrome ? (
          // Monochrome symbol: render bag in currentColor
          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            width={symbolHeight}
            height={symbolHeight}
            style={{ flexShrink: 0 }}
          >
            <BagSymbolPaths accent="currentColor" maskId={maskId} />
          </svg>
        ) : (
          bagSymbol
        )}
      </span>
    );
  }

  if (variant === "wordmark" || variant === "monochrome") {
    return (
      <span
        {...accessibilityProps}
        className={cn("inline-flex shrink-0 items-center", className)}
      >
        {wordmark}
      </span>
    );
  }

  if (variant === "stacked") {
    return (
      <span
        {...accessibilityProps}
        className={cn(
          "inline-flex shrink-0 flex-col items-center gap-1",
          className,
        )}
      >
        {bagSymbol}
        {wordmark}
        {showTagline && (
          <span
            aria-hidden="true"
            style={{
              fontSize: symbolHeight * 0.28,
              letterSpacing: "0.14em",
              color: "var(--mwezora-logo-foreground, var(--foreground))",
              opacity: 0.55,
              textTransform: "uppercase",
              fontWeight: 500,
            }}
          >
            Discover Something Wonderful
          </span>
        )}
      </span>
    );
  }

  // Default: "horizontal" — [bag] wordmark
  return (
    <span
      {...accessibilityProps}
      className={cn(
        "inline-flex shrink-0 items-center",
        className,
      )}
      style={{ gap: `${symbolHeight * 0.3}px` }}
    >
      {bagSymbol}
      {wordmark}
    </span>
  );
}

// ─── Clickable wrapper ────────────────────────────────────────────────────────

export type MwezoraLogoLinkProps = MwezoraLogoProps & {
  href?: string;
  id?: string;
  linkClassName?: string;
};

/**
 * MwezoraLogoLink — wraps MwezoraLogo in a Next.js Link.
 * Clicking navigates to the marketplace home by default.
 */
export function MwezoraLogoLink({
  href = "/",
  id,
  linkClassName,
  label = "Mwezora marketplace home",
  ...logoProps
}: MwezoraLogoLinkProps) {
  return (
    <Link
      id={id}
      href={href}
      aria-label={label ?? "Mwezora marketplace home"}
      className={cn(
        "inline-flex shrink-0 items-center outline-none ring-offset-background focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        linkClassName,
      )}
    >
      {/* Logo is decorative here — the Link already carries the accessible label */}
      <MwezoraLogo {...logoProps} label={null} />
    </Link>
  );
}
