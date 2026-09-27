import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  update: vi.fn(),
  createNotification: vi.fn(),
}));
vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    subOrder: { findFirst: mocks.findFirst, update: mocks.update },
    notification: { create: mocks.createNotification },
  },
}));

import { OrderService } from "@/services/order";

describe("vendor order status isolation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cannot update an order until it matches the derived vendor tenant", async () => {
    mocks.findFirst.mockResolvedValue(null);
    await expect(
      OrderService.updateSubOrderStatus("order-b", "SHIPPED", "vendor-a"),
    ).resolves.toBeNull();
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: { id: "order-b", vendorId: "vendor-a" },
      select: { id: true, status: true },
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
