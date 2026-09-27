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
  it("uses the centralized intentional 10 percent fallback", () => {
    expect(DEFAULT_MARKETPLACE_COMMISSION_RATE.toString()).toBe("10");
    expect(resolveCommissionRate(null)).toBe(DEFAULT_MARKETPLACE_COMMISSION_RATE);
  });

  it.each(["-1", "101", "NaN", "Infinity", "malformed persisted value"])("rejects invalid persisted commission configuration: %s", (value) => {
    expect(() => resolveCommissionRate(value)).toThrow("Vendor commission configuration is invalid");
  });

  it("calculates independent vendor snapshots with Decimal half-up rounding and excludes shipping", () => {
    const result = calculateCheckoutTotals([
      { productId: "a", variantId: null, vendorId: "a", quantity: 1, unitPrice: new Decimal("10.05"), commissionRate: new Decimal("5") },
      { productId: "b", variantId: null, vendorId: "b", quantity: 1, unitPrice: new Decimal("20"), commissionRate: new Decimal("10") },
    ]);

    expect(result.vendorGroups[0]).toMatchObject({ platformCommission: new Decimal("0.5"), vendorNetEntitlement: new Decimal("9.55"), shipping: new Decimal("3500") });
    expect(result.subtotal).toEqual(new Decimal("30.05"));
  });

  it("keeps historical economics snapshots stable when the active plan rate changes", () => {
    const line = { productId: "a", variantId: null, vendorId: "a", quantity: 1, unitPrice: new Decimal("100") };
    const historical = calculateCheckoutTotals([{ ...line, commissionRate: new Decimal("5") }]).vendorGroups[0];
    const currentPlan = calculateCheckoutTotals([{ ...line, commissionRate: new Decimal("20") }]).vendorGroups[0];

    expect(historical.commissionRate).toEqual(new Decimal("5"));
    expect(historical.platformCommission).toEqual(new Decimal("5"));
    expect(historical.vendorNetEntitlement).toEqual(new Decimal("95"));
    expect(currentPlan.vendorNetEntitlement).toEqual(new Decimal("80"));
    expect(historical.vendorNetEntitlement).toEqual(new Decimal("95"));
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

  it("reconciles GMV, commission revenue, and pending vendor liability separately", () => {
    const result = calculateCheckoutTotals([
      { productId: "a", variantId: null, vendorId: "a", quantity: 1, unitPrice: new Decimal("100"), commissionRate: new Decimal("10") },
      { productId: "b", variantId: null, vendorId: "b", quantity: 1, unitPrice: new Decimal("50"), commissionRate: new Decimal("20") },
    ]);
    const gmv = result.vendorGroups.reduce((sum, group) => sum.plus(group.subtotal), new Decimal(0));
    const platformCommissionRevenue = result.vendorGroups.reduce((sum, group) => sum.plus(group.platformCommission), new Decimal(0));
    const vendorLiabilityPending = result.vendorGroups.reduce((sum, group) => sum.plus(group.vendorNetEntitlement), new Decimal(0));

    expect(gmv).toEqual(new Decimal("150"));
    expect(platformCommissionRevenue).toEqual(new Decimal("20"));
    expect(vendorLiabilityPending).toEqual(new Decimal("130"));
    expect(gmv).toEqual(platformCommissionRevenue.plus(vendorLiabilityPending));
  });
});
