import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { analyticsPeriodSchema, inventoryAdjustmentSchema, vendorProductCreateSchema } from "@/lib/api/v1/contracts";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("V1 vendor mobile contracts", () => {
  it("bounds analytics and inventory mutation inputs", () => {
    expect(analyticsPeriodSchema.safeParse("90D").success).toBe(false);
    expect(inventoryAdjustmentSchema.safeParse({ productId: "00000000-0000-4000-8000-000000000000", operation: "DECREMENT", quantity: 0, reason: "DAMAGE" }).success).toBe(false);
    expect(vendorProductCreateSchema.safeParse({ name: "Tea", slug: "tea", basePrice: 10, vendorId: "injected" }).success).toBe(false);
  });

  it("keeps stock adjustment vendor-scoped and atomically guarded", () => {
    const inventory = source("src/services/vendor-inventory.ts");
    expect(inventory).toContain('requireVendorContext("vendor:manage_products")');
    expect(inventory).toContain('inventoryCount: { gte: input.quantity }');
    expect(inventory).toContain('vendorId: context.vendorId');
  });

  it("uses strict asset references and server-derived vendor context", () => {
    const assets = source("src/lib/api/v1/vendor-assets.ts");
    const products = source("src/app/api/v1/vendor/products/route.ts");
    expect(assets).toContain("products/${vendorId}/draft/");
    expect(products).toContain("resolveVendorAssetRef");
    expect(products).toContain("vendorId: context.vendorId");
  });

  it("keeps new vendor adapters on shared auth and service boundaries", () => {
    const routes = [
      "src/app/api/v1/uploads/route.ts", "src/app/api/v1/vendor/dashboard/route.ts", "src/app/api/v1/vendor/analytics/route.ts",
      "src/app/api/v1/vendor/shop/route.ts", "src/app/api/v1/vendor/products/route.ts", "src/app/api/v1/vendor/products/[id]/route.ts",
      "src/app/api/v1/vendor/inventory/route.ts", "src/app/api/v1/vendor/inventory/adjustments/route.ts",
      "src/app/api/v1/orders/[id]/payment-status/route.ts", "src/app/api/v1/devices/route.ts", "src/app/api/v1/devices/[id]/route.ts",
    ].map(source);
    for (const route of routes) {
      expect(route).not.toMatch(/authorization\s*\)|bearer\s|verifyIdToken|cookies\s*\(/i);
      expect(route).not.toContain('from "@/lib/prisma/client"');
    }
  });
});
