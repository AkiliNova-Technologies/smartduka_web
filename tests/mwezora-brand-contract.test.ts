import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { brand } from "@/config/brand";
import manifest from "@/app/manifest";

const source = (file: string) =>
  readFileSync(resolve(process.cwd(), file), "utf8");

describe("Mwezora customer-facing brand", () => {
  it("centralizes the public identity and points to supplied assets", () => {
    expect(brand.name).toBe("Mwezora");
    expect(brand.tagline).toBe("Discover Something Wonderful");
    for (const path of [...Object.values(brand.logo), ...Object.values(brand.appIcons)]) {
      expect(path.startsWith("/")).toBe(true);
      expect(existsSync(resolve(process.cwd(), "public", path.slice(1)))).toBe(true);
    }
  });

  it("uses accessible reusable branding in the marketplace header and footer", () => {
    const component = source("src/components/brand/brand.tsx");
    const header = source("src/components/layout/Header.tsx");
    const footer = source("src/components/layout/MarketplaceFooter.tsx");
    // brand.tsx still exports BrandLink (legacy) with accessible label and href="/"
    expect(component).toContain("${brand.name} marketplace home");
    expect(component).toContain('href="/"');
    expect(component).toContain("brand.logo.adaptive");
    // Header uses MwezoraLogoLink — symbol on mobile, horizontal on desktop
    expect(header).toContain('variant="symbol"');
    expect(header).toContain('className="hidden md:inline-flex"');
    // Footer uses MwezoraLogoLink for adaptive two-tone branding
    expect(footer).toContain("<MwezoraLogoLink");
    expect(footer).toContain("{brand.name}. All Rights Reserved");
  });

  it("keeps logo coloring theme-aware without changing accent preferences", () => {
    const component = source("src/components/brand/brand.tsx");
    const logoComponent = source("src/components/brand/MwezoraLogo.tsx");
    // Legacy BrandLogo still uses maskImage technique for single-colour use cases
    expect(component).toContain("maskImage");
    expect(component).toContain("bg-current");
    // Adaptive logo uses CSS custom properties for two-tone accent
    expect(logoComponent).toContain("--mwezora-logo-accent");
    expect(logoComponent).toContain("--mwezora-logo-foreground");
    // Accent and theme remain driven by the existing appearance system
    expect(source("src/lib/appearance.ts")).toContain('accentColor: "classic"');
    expect(source("src/providers/AppearanceProvider.tsx")).toContain("dataset.accent");
  });

  it("brands authentication, account appearance, metadata, and the PWA", () => {
    expect(source("src/app/login/page.tsx")).toContain("<BrandLink");
    expect(source("src/app/register/page.tsx")).toContain("<BrandLink");
    expect(source("src/components/login-form.tsx")).toContain("Mwezora");
    expect(source("src/components/register-form.tsx")).toContain("Mwezora");
    expect(source("src/app/(customer)/settings/settings-content.tsx")).toContain("Mwezora");
    expect(source("src/app/layout.tsx")).toContain("openGraph");
    expect(source("src/app/layout.tsx")).toContain("twitter");
    expect(manifest().short_name).toBe("Mwezora");
    expect(manifest().icons?.every((icon) => existsSync(resolve(process.cwd(), "public", icon.src.slice(1))))).toBe(true);
  });

  it("does not expose the working name in customer-facing surfaces", () => {
    const customerFiles = [
      "src/app/(customer)/products/page.tsx",
      "src/app/(customer)/shops/page.tsx",
      "src/app/(customer)/help/page.tsx",
      "src/app/(customer)/orders/[id]/OrderDetailClient.tsx",
      "src/app/login/page.tsx",
      "src/app/register/page.tsx",
      "src/app/become-seller/page.tsx",
      "src/components/layout/Header.tsx",
      "src/components/layout/MarketplaceFooter.tsx",
      "src/components/layout/CustomerNavigationSheet.tsx",
      "src/components/login-form.tsx",
      "src/components/register-form.tsx",
    ];
    const visibleSources = customerFiles
      .map(source)
      .join("\n");
    expect(visibleSources).not.toMatch(/Smart(?:Duka|[^\n]*Duka)/i);
  });

  it("uses inline SVG logo component for adaptive two-tone accent coloring", () => {
    const logoComponent = source("src/components/brand/MwezoraLogo.tsx");
    // Component must not use external SVG img references for the adaptive logo
    expect(logoComponent).not.toContain('src="/mwezora');
    // Must embed the bag geometry inline (handle arch path)
    expect(logoComponent).toContain("M33 36 C33 21 39 11 49 11");
    // Must use CSS variable for accent (bag + zora)
    expect(logoComponent).toContain("--mwezora-logo-accent");
    // Must use CSS variable for foreground (Mwe)
    expect(logoComponent).toContain("--mwezora-logo-foreground");
    // Must be a client component to use useId
    expect(logoComponent).toContain('"use client"');
    // MwezoraLogoLink must navigate to marketplace home
    expect(logoComponent).toContain('href = "/"');
  });
});
