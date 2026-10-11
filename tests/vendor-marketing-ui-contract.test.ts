import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const file = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const source = file("src/app/(vendor)/vendor/marketing/page.tsx");
const sheet = file("src/components/vendor/marketing/promotion-sheet.tsx");
const hook = file("src/hooks/use-vendor-marketing.ts");
const client = file("src/lib/vendor-promotions-client.ts");

describe("vendor marketing UI", () => {
  it("keeps transport below feature hooks", () => {
    expect(source).not.toContain("fetch(");
    expect(sheet).not.toContain("fetch(");
    expect(source).not.toContain("/api/");
    expect(sheet).not.toContain("/api/");
    expect(hook).toContain("vendorPromotionsClient");
    expect(client).toContain('"/api/v1/vendor/promotions/quote"');
    expect(source).toContain("<DataTable");
    expect(source).toContain("<PaginationControls");
    expect(sheet).toContain("<Sheet");
  });

  it("validates selection and protects newer quote/search state", () => {
    expect(sheet).toMatch(/const valid\s*=\s*targetType\s*===\s*"SHOP"\s*\|\|\s*Boolean\(selectedProduct\)/);
    expect(sheet).toMatch(/schedule\s*===\s*"NOW"\s*\|\|\s*Boolean\(start\)/);
    expect(sheet).toContain("No matching active products.");
    expect(hook).toContain("generation===quoteRequest.current");
    expect(hook).toContain("generation===searchRequest.current");
    expect(hook).toContain("searchAbort.current?.abort()");
  });

  it("presents authoritative credit, pricing, and payment states", () => {
    expect(sheet).toContain("promotionalCreditAvailable");
    expect(sheet).toContain("Final amount due");
    expect(sheet).toContain("MTN Mobile Money");
    expect(hook).toContain("if(!created||submitting)return");
    expect(hook).toContain("idempotencyKey.current");
    expect(hook).toContain("paymentKey.current");
    for (const text of ["Masked provider reference", "Promotional credit applied", "Queued after existing promotion", "Payment confirmation is pending", "Payment confirmation is taking longer than expected.", "Payment failed. Any reserved promotional credit has been restored.", "Payment reversed — review required."]) expect(source).toContain(text);
    expect(source).not.toContain("OAuth tokens");
    expect(source).not.toContain("merchant secrets");
  });
});
