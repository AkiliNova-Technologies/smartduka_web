import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");
describe("UI-11B.6B.2 marketing combobox contract", () => {
  it("uses a portalled Popover and shared Command primitives instead of an in-flow menu", () => {
    const picker = source("src/components/marketing/admin/marketing-entity-combobox.tsx");
    const popover = source("src/components/ui/popover.tsx");
    expect(picker).toContain("PopoverContent");
    expect(picker).toContain("CommandInput");
    expect(picker).not.toContain("absolute z-50");
    expect(popover).toContain("PopoverPrimitive.Portal");
  });
  it("keeps all marketing entity choices on the shared picker and clears changed CTA destinations", () => {
    const actionFields = source("src/components/marketing/admin/promotion/promotion-action-fields.tsx");
    expect(actionFields).toContain("MarketingEntityCombobox");
    expect(actionFields).toContain('change("primaryCtaValue", "")');
    expect(actionFields).toContain('change("secondaryCtaValue", "")');
    expect(source("src/components/marketing/featured-products-manager.tsx")).toContain("MarketingEntityCombobox");
    expect(source("src/components/marketing/featured-shops-manager.tsx")).toContain("MarketingEntityCombobox");
  });
  it("has no visible native selects or checkbox inputs in admin marketing components", () => {
    const files = ["src/components/marketing/featured-products-manager.tsx", "src/components/marketing/featured-shops-manager.tsx", "src/components/marketing/admin/promotion/promotion-action-fields.tsx", "src/components/marketing/admin/promotion/promotion-placement-fields.tsx"];
    for (const file of files) {
      const content = source(file);
      expect(content).not.toMatch(/<select[\s>]/);
      expect(content).not.toMatch(/type=["']checkbox["']/);
    }
  });
});
