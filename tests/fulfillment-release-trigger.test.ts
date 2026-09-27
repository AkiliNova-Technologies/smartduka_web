import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  update: vi.fn(),
  notification: vi.fn(),
  release: vi.fn(),
}));
vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    subOrder: { findFirst: mocks.findFirst, update: mocks.update },
    notification: { create: mocks.notification },
  },
}));
vi.mock("@/services/marketplace-economics", () => ({
  MarketplaceEconomicsService: { releaseVendorEarningsForSubOrder: mocks.release },
}));

import { OrderService } from "@/services/order";

describe("fulfillment-triggered earnings release", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findFirst.mockResolvedValue({ id: "suborder-1", status: "SHIPPED" });
    mocks.update.mockResolvedValue({
      id: "suborder-1", subOrderNumber: "SD-1-V1", status: "DELIVERED",
      order: { id: "order-1", customerId: "customer-1", orderNumber: "SD-1" },
    });
  });

  it("releases only after the vendor's own shipped SubOrder reaches DELIVERED", async () => {
    await OrderService.updateSubOrderStatus("suborder-1", "DELIVERED", "vendor-a");
    expect(mocks.findFirst).toHaveBeenCalledWith({ where: { id: "suborder-1", vendorId: "vendor-a" }, select: { id: true, status: true } });
    expect(mocks.release).toHaveBeenCalledWith("suborder-1");
  });

  it("rejects lifecycle jumps such as PROCESSING directly to DELIVERED", async () => {
    mocks.findFirst.mockResolvedValue({ id: "suborder-1", status: "PROCESSING" });
    await expect(OrderService.updateSubOrderStatus("suborder-1", "DELIVERED", "vendor-a")).rejects.toThrow("Invalid SubOrder fulfillment status transition");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("preserves authoritative delivery when release accounting temporarily fails", async () => {
    mocks.release.mockRejectedValue(new Error("ledger unavailable"));
    await expect(OrderService.updateSubOrderStatus("suborder-1", "DELIVERED", "vendor-a")).resolves.toMatchObject({ status: "DELIVERED" });
    expect(mocks.update).toHaveBeenCalledOnce();
  });
});
