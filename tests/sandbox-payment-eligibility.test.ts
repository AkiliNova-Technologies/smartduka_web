import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ vendorFindUnique: vi.fn() }));
vi.mock("@/lib/prisma/client", () => ({ prisma: { vendorProfile: { findUnique: mocks.vendorFindUnique } } }));

import { PaymentProvider } from "@prisma/client";
import { PaymentProviderRegistry, PaymentProviderUnavailableError } from "@/lib/payments/payment-provider";
import { PaymentEligibilityService } from "@/services/payment-eligibility";

const environment = { ...process.env };
const verified: { id: string; provider: PaymentProvider; status: string; suspendedAt: Date | null } = { id: "qualification-account", provider: PaymentProvider.MTN_MOMO, status: "VERIFIED", suspendedAt: null };
const activeVendor = (paymentAccounts = [verified]) => ({ status: "ACTIVE", deletedAt: null, paymentAccounts });

beforeEach(() => {
  vi.clearAllMocks();
  process.env.MTN_MOMO_BASE_URL = "https://sandbox.example.test";
  process.env.MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY = "test-key";
  process.env.MTN_MOMO_API_USER = "test-user";
  process.env.MTN_MOMO_API_KEY = "test-secret";
  process.env.MTN_MOMO_ENVIRONMENT = "sandbox";
  process.env.MTN_SANDBOX_COLLECTION_TESTING_ENABLED = "true";
  process.env.MTN_MOMO_DIRECT_VENDOR_ROUTING_VERIFIED = "false";
  process.env.MTN_DIRECT_VENDOR_ROUTING_VERIFIED = "false";
  process.env.PAYMENTS_MTN_ENABLED = "false";
});
afterEach(() => { process.env = { ...environment }; });

describe("sandbox reconciliation payment eligibility", () => {
  it("permits only the controlled sandbox qualification path for a verified MTN account", async () => {
    mocks.vendorFindUnique.mockResolvedValue(activeVendor());
    await expect(PaymentEligibilityService.canAcceptPayments("vendor-a", PaymentProvider.MTN_MOMO, { sandboxQualification: true })).resolves.toMatchObject({ eligible: true, accountId: "qualification-account" });
    expect(PaymentProviderRegistry.isSandboxQualificationReady(PaymentProvider.MTN_MOMO)).toBe(true);
  });

  it.each(["PENDING", "REJECTED", "SUSPENDED"])("rejects a %s fixture account", async (status) => {
    mocks.vendorFindUnique.mockResolvedValue(activeVendor([{ ...verified, status, suspendedAt: status === "SUSPENDED" ? new Date() : null }]));
    await expect(PaymentEligibilityService.canAcceptPayments("vendor-a", PaymentProvider.MTN_MOMO, { sandboxQualification: true })).resolves.toMatchObject({ eligible: false });
  });

  it("rejects an inactive shop even for qualification", async () => {
    mocks.vendorFindUnique.mockResolvedValue({ ...activeVendor(), status: "SUSPENDED" });
    await expect(PaymentEligibilityService.canAcceptPayments("vendor-a", PaymentProvider.MTN_MOMO, { sandboxQualification: true })).resolves.toEqual({ eligible: false, reasons: ["SHOP_INACTIVE"] });
  });

  it("does not let ordinary customer initiation use sandbox testing or unverified routing", () => {
    process.env.PAYMENTS_MTN_ENABLED = "true";
    expect(() => PaymentProviderRegistry.assertCustomerPaymentsReady(PaymentProvider.MTN_MOMO)).toThrow(PaymentProviderUnavailableError);
  });

  it("never enables the qualification capability in production", () => {
    process.env.MTN_MOMO_ENVIRONMENT = "production";
    expect(PaymentProviderRegistry.isSandboxQualificationReady(PaymentProvider.MTN_MOMO)).toBe(false);
  });
});
