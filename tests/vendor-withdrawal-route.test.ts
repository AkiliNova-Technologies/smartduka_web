import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ context: vi.fn(), request: vi.fn(), list: vi.fn() }));
vi.mock("@/lib/auth/vendor-context", () => ({ requireVendorContext: mocks.context, VendorAuthorizationError: class VendorAuthorizationError extends Error {} }));
vi.mock("@/lib/auth/session", () => ({ AuthenticationRequiredError: class AuthenticationRequiredError extends Error {} }));
vi.mock("@/services/vendor-withdrawal", () => ({ VendorWithdrawalService: { requestWithdrawal: mocks.request, listWithdrawals: mocks.list }, WithdrawalError: class WithdrawalError extends Error {} }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

import { GET, POST } from "@/app/api/vendor/withdrawals/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.context.mockResolvedValue({ vendorId: "vendor-a", user: { id: "user-a" } });
});

describe("vendor withdrawal route authority", () => {
  it("ignores a browser-supplied vendor ID and derives the tenant from authenticated context", async () => {
    mocks.request.mockResolvedValue({ id: "payout-1", amount: 60000, currency: "UGX", status: "REQUESTED", maskedDestination: "Bank •••• 1234" });
    const response = await POST(new Request("https://smartduka.test/api/vendor/withdrawals", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ vendorId: "vendor-b", amount: "60000", currency: "UGX", destinationId: "payout-account-a", withdrawalRequestId: "withdrawal-request-0001" }) }) as never);
    expect(response.status).toBe(201);
    expect(mocks.request).toHaveBeenCalledWith(expect.objectContaining({ vendorId: "vendor-a", userId: "user-a" }));
  });

  it("lists only the authenticated vendor withdrawal requests", async () => {
    mocks.list.mockResolvedValue([]);
    await GET();
    expect(mocks.list).toHaveBeenCalledWith("vendor-a");
  });
});
