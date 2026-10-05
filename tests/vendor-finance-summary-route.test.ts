import { beforeEach, describe, expect, it, vi } from "vitest";
import { Decimal } from "@prisma/client/runtime/client";

const mocks = vi.hoisted(() => ({ context: vi.fn(), balances: vi.fn(), payoutAccountFindMany: vi.fn() }));
vi.mock("@/lib/auth/vendor-context", () => ({ requireVendorContext: mocks.context, VendorAuthorizationError: class VendorAuthorizationError extends Error {} }));
vi.mock("@/lib/auth/session", () => ({ AuthenticationRequiredError: class AuthenticationRequiredError extends Error {} }));
vi.mock("@/services/marketplace-economics", () => ({ MarketplaceEconomicsService: { vendorBalances: mocks.balances } }));
vi.mock("@/lib/prisma/client", () => ({ prisma: { vendorPayoutAccount: { findMany: mocks.payoutAccountFindMany } } }));
vi.mock("@/services/disbursement-provider", () => ({ VENDOR_DISBURSEMENTS_ENABLED: false }));
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));

import { GET } from "@/app/api/vendor/finance/summary/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.context.mockResolvedValue({ vendorId: "vendor-a" });
  mocks.balances.mockResolvedValue({ currency: "UGX", pendingBalance: new Decimal("12000"), availableBalance: new Decimal("60000"), reservedBalance: new Decimal("5000"), paidOutTotal: new Decimal("40000") });
  mocks.payoutAccountFindMany.mockResolvedValue([{ id: "payout-account-1", provider: "MTN_MOBILE_MONEY", maskedReference: "+25677••• ••42" }]);
});

describe("vendor finance summary projection", () => {
  it("returns a Decimal-safe, server-authoritative projection for the authenticated vendor only", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(mocks.balances).toHaveBeenCalledWith("vendor-a", "UGX");
    expect(mocks.payoutAccountFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { vendorId: "vendor-a", status: "ACTIVE" } }));
    await expect(response.json()).resolves.toMatchObject({ success: true, data: { currency: "UGX", balances: { pending: "12000.00", available: "60000.00", reserved: "5000.00", paidOut: "40000.00" }, hasAvailableBalance: true, disbursementsEnabled: false, destinations: [{ id: "payout-account-1", label: "MTN Mobile Money", maskedDestination: "+25677••• ••42" }] } });
  });

  it("does not expose an unmasked payout destination when no destination is configured", async () => {
    mocks.payoutAccountFindMany.mockResolvedValue([]);
    const response = await GET();
    await expect(response.json()).resolves.toMatchObject({ data: { destinations: [] } });
  });
});
