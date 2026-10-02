import { beforeEach, describe, expect, it, vi } from "vitest";
import { Decimal } from "@prisma/client/runtime/client";

const mocks = vi.hoisted(() => ({ context: vi.fn(), balances: vi.fn(), vendorFindUnique: vi.fn() }));
vi.mock("@/lib/auth/vendor-context", () => ({ requireVendorContext: mocks.context, VendorAuthorizationError: class VendorAuthorizationError extends Error {} }));
vi.mock("@/lib/auth/session", () => ({ AuthenticationRequiredError: class AuthenticationRequiredError extends Error {} }));
vi.mock("@/services/marketplace-economics", () => ({ MarketplaceEconomicsService: { vendorBalances: mocks.balances } }));
vi.mock("@/lib/prisma/client", () => ({ prisma: { vendorProfile: { findUnique: mocks.vendorFindUnique } } }));
vi.mock("@/services/disbursement-provider", () => ({ VENDOR_DISBURSEMENTS_ENABLED: false }));

import { GET } from "@/app/api/vendor/finance/summary/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.context.mockResolvedValue({ vendorId: "vendor-a" });
  mocks.balances.mockResolvedValue({ currency: "UGX", pendingBalance: new Decimal("12000"), availableBalance: new Decimal("60000"), reservedBalance: new Decimal("5000"), paidOutTotal: new Decimal("40000") });
  mocks.vendorFindUnique.mockResolvedValue({ momoMerchantCode: "0777000000", bankName: "Example Bank", bankAccountNumber: "001234" });
});

describe("vendor finance summary projection", () => {
  it("returns a Decimal-safe, server-authoritative projection for the authenticated vendor only", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(mocks.balances).toHaveBeenCalledWith("vendor-a", "UGX");
    expect(mocks.vendorFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "vendor-a" } }));
    await expect(response.json()).resolves.toMatchObject({ success: true, data: { currency: "UGX", balances: { pending: "12000.00", available: "60000.00", reserved: "5000.00", paidOut: "40000.00" }, hasAvailableBalance: true, disbursementsEnabled: false, destinations: [{ id: "MOBILE_MONEY", maskedDestination: "Mobile money •••• 0000" }, { id: "BANK_ACCOUNT", maskedDestination: "Example Bank •••• 1234" }] } });
  });

  it("does not expose an unmasked payout destination when no destination is configured", async () => {
    mocks.vendorFindUnique.mockResolvedValue({ momoMerchantCode: null, bankName: null, bankAccountNumber: null });
    const response = await GET();
    await expect(response.json()).resolves.toMatchObject({ data: { destinations: [] } });
  });
});
