import { beforeEach, describe, expect, it, vi } from "vitest";
import { Decimal } from "@prisma/client/runtime/client";

const mocks = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@/lib/prisma/client", () => ({ prisma: { financialLedger: { findMany: mocks.findMany } } }));
vi.mock("@/lib/vendor/vendor-context", () => ({ VendorContext: { getVendorId: vi.fn() } }));

import { calculateCheckoutTotals, DEFAULT_MARKETPLACE_COMMISSION_RATE, resolveCommissionRate } from "@/services/order";
import { MarketplaceEconomicsService } from "@/services/marketplace-economics";
import { VendorContext } from "@/lib/vendor/vendor-context";

beforeEach(() => vi.clearAllMocks());

describe("Phase 3F marketplace economics", () => {
  it("uses zero marketplace commission for direct-to-vendor payments", () => {
    expect(DEFAULT_MARKETPLACE_COMMISSION_RATE.toString()).toBe("0");
    expect(resolveCommissionRate(null)).toBe(DEFAULT_MARKETPLACE_COMMISSION_RATE);
  });

  it.each(["-1", "101", "NaN", "Infinity", "malformed persisted value"])("ignores legacy commission configuration under direct settlement: %s", (value) => {
    expect(resolveCommissionRate(value).toString()).toBe("0");
  });

  it("calculates independent vendor totals without diverting merchandise value", () => {
    const result = calculateCheckoutTotals([
      { productId: "a", variantId: null, vendorId: "a", quantity: 1, unitPrice: new Decimal("10.05"), commissionRate: new Decimal("5") },
      { productId: "b", variantId: null, vendorId: "b", quantity: 1, unitPrice: new Decimal("20"), commissionRate: new Decimal("10") },
    ]);

    expect(result.vendorGroups[0].platformCommission.toString()).toBe("0");
    expect(result.vendorGroups[0].vendorNetEntitlement.toString()).toBe("3510.05");
    expect(result.vendorGroups[0].shipping.toString()).toBe("3500");
    expect(result.subtotal.toString()).toBe("30.05");
  });

  it("does not let subscription-plan rates alter customer-to-vendor settlement", () => {
    const line = { productId: "a", variantId: null, vendorId: "a", quantity: 1, unitPrice: new Decimal("100") };
    const historical = calculateCheckoutTotals([{ ...line, commissionRate: new Decimal("5") }]).vendorGroups[0];
    const currentPlan = calculateCheckoutTotals([{ ...line, commissionRate: new Decimal("20") }]).vendorGroups[0];

    expect(historical.commissionRate.toString()).toBe("0");
    expect(historical.platformCommission.toString()).toBe("0");
    expect(historical.vendorNetEntitlement.toString()).toBe("3600");
    expect(currentPlan.vendorNetEntitlement.toString()).toBe("3600");
  });

  it("derives vendor balances per currency and bucket without mixing currencies", async () => {
    mocks.findMany.mockResolvedValue([
      { amount: new Decimal("50000"), walletBucket: "PENDING" },
      { amount: new Decimal("-50000"), walletBucket: "PENDING" },
      { amount: new Decimal("50000"), walletBucket: "AVAILABLE" },
      { amount: new Decimal("70000"), walletBucket: "PENDING" },
    ]);

    const balance = await MarketplaceEconomicsService.vendorBalances("a", "UGX");

    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { vendorId: "a", currency: "UGX" } }));
    expect(balance).toMatchObject({ currency: "UGX", pendingBalance: new Decimal("70000"), availableBalance: new Decimal("50000"), reservedBalance: new Decimal("0") });
  });

  it("derives vendor-facing balances only from the authenticated vendor context", async () => {
    vi.mocked(VendorContext.getVendorId).mockReturnValue("vendor-a");
    mocks.findMany.mockResolvedValue([{ amount: new Decimal("95"), walletBucket: "AVAILABLE" }]);

    const balance = await MarketplaceEconomicsService.vendorBalancesForCurrentVendor("USD");

    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { vendorId: "vendor-a", currency: "USD" } }));
    expect(balance.availableBalance).toEqual(new Decimal("95"));
  });

  it("requires derived vendor context for vendor-facing balances", async () => {
    vi.mocked(VendorContext.getVendorId).mockReturnValue(null);

    await expect(MarketplaceEconomicsService.vendorBalancesForCurrentVendor("UGX")).rejects.toThrow("Vendor context");
  });

  it("reconciles GMV entirely to vendor value under direct settlement", () => {
    const result = calculateCheckoutTotals([
      { productId: "a", variantId: null, vendorId: "a", quantity: 1, unitPrice: new Decimal("100"), commissionRate: new Decimal("10") },
      { productId: "b", variantId: null, vendorId: "b", quantity: 1, unitPrice: new Decimal("50"), commissionRate: new Decimal("20") },
    ]);
    const gmv = result.vendorGroups.reduce((sum, group) => sum.plus(group.subtotal), new Decimal(0));
    const platformCommissionRevenue = result.vendorGroups.reduce((sum, group) => sum.plus(group.platformCommission), new Decimal(0));
    const directVendorValue = result.vendorGroups.reduce((sum, group) => sum.plus(group.vendorNetEntitlement), new Decimal(0));
    const checkoutTotal = result.vendorGroups.reduce((sum, group) => sum.plus(group.total), new Decimal(0));

    expect(gmv.toString()).toBe("150");
    expect(platformCommissionRevenue.toString()).toBe("0");
    expect(directVendorValue.toString()).toBe("7150");
    expect(checkoutTotal.toString()).toBe(directVendorValue.toString());
  });
});
