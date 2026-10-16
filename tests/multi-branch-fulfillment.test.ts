import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkoutBodySchema } from "@/lib/api/v1/contracts";
import { shopBranchInputSchema } from "@/services/shop-branches";

const checkout = { checkoutRequestId: "checkout-request-0001", items: [{ productId: "product-a", quantity: 1 }], shippingPhone: "0700000000", paymentGateway: "MTN_MOMO" as const };

describe("multi-branch fulfilment contracts", () => {
  it("keeps pickup-only mobile checkout backward compatible without an address", () => {
    const parsed = checkoutBodySchema.parse({ ...checkout, fulfillmentSelections: [{ vendorId: "vendor-a", method: "PICKUP", branchId: "7bea830b-8ab7-4aee-8793-09c7248b4039", pickupContact: "0700000000" }] });
    expect(parsed.shippingAddress).toBe("");
  });

  it("requires every active customer-facing branch to offer a method", () => {
    const result = shopBranchInputSchema.safeParse({ name: "Central", slug: "central", isActive: true, pickupEnabled: false, deliveryEnabled: false, deliveryAreas: [] });
    expect(result.success).toBe(false);
  });

  it("requires pickup locations to have a real address", () => {
    const result = shopBranchInputSchema.safeParse({ name: "Central", slug: "central", isActive: true, pickupEnabled: true, deliveryEnabled: false, deliveryAreas: [] });
    expect(result.success).toBe(false);
  });

  it("enforces one primary location per shop at the database layer", () => {
    const migration = readFileSync("prisma/migrations/20261012120000_multi_branch_fulfillment/migration.sql", "utf8");
    expect(migration).toContain('CREATE UNIQUE INDEX "ShopBranch_one_primary_per_shop"');
    expect(migration).toContain('WHERE "isPrimary" = true');
  });

  it("preserves branches referenced by historical orders", () => {
    const migration = readFileSync("prisma/migrations/20261012120000_multi_branch_fulfillment/migration.sql", "utf8");
    expect(migration).toContain('ON DELETE RESTRICT ON UPDATE CASCADE');
  });
});
