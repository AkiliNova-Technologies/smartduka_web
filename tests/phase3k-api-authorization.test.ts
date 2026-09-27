/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  refundFind: vi.fn(),
  returnFind: vi.fn(),
  reserve: vi.fn(),
  refunds: vi.fn(),
  returns: vi.fn(),
  vendorRefund: vi.fn(),
  vendorReturn: vi.fn(),
  adminRefunds: vi.fn(),
  adminReturns: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ getCurrentUserId: mocks.user }));
vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    refund: { findFirst: mocks.refundFind },
    returnRequest: { findFirst: mocks.returnFind },
  },
}));
vi.mock("@/services/returns-refunds", () => ({
  ReturnsRefundsService: {
    createRefundReservation: mocks.reserve,
    listRefundsForCurrentCustomer: mocks.refunds,
    listReturnsForCurrentCustomer: mocks.returns,
    getVendorRefundById: mocks.vendorRefund,
    getVendorReturnById: mocks.vendorReturn,
    listRefundsForCurrentAdmin: mocks.adminRefunds,
    listReturnsForCurrentAdmin: mocks.adminReturns,
  },
}));
import * as refunds from "@/app/api/refunds/route";
import * as refundDetail from "@/app/api/refunds/[id]/route";
import * as returnDetail from "@/app/api/returns/[id]/route";
import * as adminRefunds from "@/app/api/admin/refunds/route";
import * as adminReturns from "@/app/api/admin/returns/route";
const req = (body: any) =>
  new Request("http://smartduka.test/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue("customer-a");
  mocks.reserve.mockResolvedValue({
    id: "r",
    status: "REQUESTED",
    amount: 1,
    currency: "UGX",
    reason: "x",
    createdAt: new Date(),
  });
  mocks.refunds.mockResolvedValue([]);
  mocks.returns.mockResolvedValue([]);
});
describe("Phase 3K intent and tenant authorization routes", () => {
  it("accepts customer intent only and rejects browser monetary authority", async () => {
    expect(
      (
        await refunds.POST(
          req({
            subOrderId: "s",
            items: [{ orderItemId: "i", quantity: 1 }],
            reason: "x",
          }) as any,
        )
      ).status,
    ).toBe(201);
    for (const key of [
      "requestedGross",
      "grossAmount",
      "platformCommissionAdjustment",
      "vendorLiabilityAdjustment",
      "shippingAmount",
      "gatewayFeeAdjustment",
    ])
      expect(
        (
          await refunds.POST(
            req({ subOrderId: "s", items: [], [key]: 1 }) as any,
          )
        ).status,
      ).toBe(400);
  });
  it("scopes customer refund and return detail to the authenticated tenant", async () => {
    mocks.refundFind.mockResolvedValue(null);
    mocks.returnFind.mockResolvedValue(null);
    expect(
      (
        await refundDetail.GET(new Request("http://x"), {
          params: Promise.resolve({ id: "other" }),
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await returnDetail.GET(new Request("http://x"), {
          params: Promise.resolve({ id: "other" }),
        })
      ).status,
    ).toBe(404);
    expect(mocks.refundFind).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "other", requestedByUserId: "customer-a" },
      }),
    );
    expect(mocks.returnFind).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "other", requestedByUserId: "customer-a" },
      }),
    );
  });
  it("denies customer/vendor actors lacking billing queue permission while authorized admin is allowed", async () => {
    mocks.adminRefunds.mockResolvedValue([]);
    mocks.adminReturns.mockResolvedValue([]);
    expect((await adminRefunds.GET()).status).toBe(200);
    expect((await adminReturns.GET()).status).toBe(200);
    mocks.adminRefunds.mockRejectedValue(new Error("Forbidden"));
    mocks.adminReturns.mockRejectedValue(new Error("Forbidden"));
    expect((await adminRefunds.GET()).status).toBe(403);
    expect((await adminReturns.GET()).status).toBe(403);
  });
});
