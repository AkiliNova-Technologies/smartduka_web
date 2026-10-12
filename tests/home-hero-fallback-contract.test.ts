import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("women-focused homepage hero fallbacks", () => {
  const hero = source("src/components/home/HeroSection.tsx");
  const promotionSection = source("src/components/marketing/promotion-section.tsx");

  it("ships all six requested demo promotions", () => {
    expect(hero.match(/id: "womens-/g)).toHaveLength(6);
    for (const copy of [
      "Your Style, Your Story.",
      "Glow Looks Good on You.",
      "The Little Details Matter.",
      "Every Crown Deserves Care.",
      "Every Step, Your Way.",
      "A Little Something Special.",
    ]) expect(hero).toContain(copy);
  });

  it("uses local responsive imagery and existing women taxonomy routes", () => {
    expect(hero).not.toContain("unsplash.com");
    expect(hero.match(/desktopImage: "\/images\/promotions\/demo-home\//g)).toHaveLength(6);
    expect(hero.match(/mobileImage: "\/images\/promotions\/demo-home\//g)).toHaveLength(6);
    expect(hero).toContain('href: "/categories/women-fashion"');
    expect(hero).toContain('href: "/categories/women-beauty"');
    expect(hero).toContain('href: "/categories/women-bags-and-accessories"');
    expect(hero).toContain('href: "/categories/women-hair-and-hair-care"');
    expect(hero).toContain('href: "/categories/women-shoes"');
    expect(hero).toContain('href: "/categories/women-jewellery-and-watches"');
  });

  it("keeps eligible paid promotions ahead of homepage demo content", () => {
    expect(promotionSection.indexOf("if (data.length)")).toBeLessThan(promotionSection.indexOf('return placement === "HOMEPAGE" ? <HeroSection /> : null'));
  });

  it("has every referenced hero image on disk", () => {
    const imagePaths = [...hero.matchAll(/(?:desktop|mobile)Image: "([^"]+)"/g)].map((match) => match[1]);
    expect(imagePaths).toHaveLength(12);
    for (const imagePath of imagePaths) expect(fs.existsSync(path.join(process.cwd(), "public", imagePath))).toBe(true);
  });
});
