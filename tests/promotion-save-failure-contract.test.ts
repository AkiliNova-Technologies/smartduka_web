import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("Hero Promotion save failure handling", () => {
  it("does not create an incomplete default CTA", () => {
    expect(source("src/components/marketing/admin/promotion/types.ts")).toContain('primaryCtaType: null');
    expect(source("src/components/marketing/admin/promotion/promotion-form.tsx")).toContain('primaryCtaType: form.primaryCtaType ?? null');
  });

  it("preserves server validation messages without an unhandled UI rethrow", () => {
    const manager = source("src/components/marketing/promotions-manager.tsx");
    expect(manager).not.toContain('throw new Error("save failed")');
    expect(manager).toContain('console.error("[Marketing] Promotion save failed", error)');
    expect(source("src/lib/marketing-client.ts")).toContain("MarketingClientError");
  });

  it("returns a structured, field-specific incomplete CTA error", () => {
    expect(source("src/services/marketing.ts")).toContain('"INVALID_PROMOTION_CTA"');
    expect(source("src/app/api/admin/marketing/promotions/route.ts")).toContain("PromotionValidationError");
  });
});
