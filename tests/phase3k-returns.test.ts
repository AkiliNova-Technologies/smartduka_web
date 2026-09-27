/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-function-type */
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  tx: vi.fn(),
  sub: vi.fn(),
  create: vi.fn(),
  ret: vi.fn(),
  retUpdate: vi.fn(),
  returnItem: vi.fn(),
  product: vi.fn(),
  variant: vi.fn(),
  vendor: vi.fn(),
}));
vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    $transaction: mocks.tx,
    returnRequest: { findUnique: mocks.ret, update: mocks.retUpdate },
  },
}));
vi.mock("@/lib/auth/session", () => ({ getCurrentUserId: vi.fn() }));
vi.mock("@/lib/auth/vendor-context", () => ({
  requireVendorContext: mocks.vendor,
}));
vi.mock("@/lib/auth/admin-context", () => ({ requireAdminContext: vi.fn() }));
import {
  RETURN_WINDOW_DAYS,
  ReturnsRefundsService,
} from "@/services/returns-refunds";
const delivered = new Date("2026-01-01T00:00:00.000Z");
const base = (x: any = {}) => ({
  id: "s",
  vendorId: "v-a",
  status: "DELIVERED",
  deliveryConfirmedAt: delivered,
  order: { customerId: "c-a" },
  items: [{ id: "i", productId: "p", variantId: null, quantity: 5 }],
  returnRequests: [],
  ...x,
});
const tx = {
  subOrder: { findUnique: mocks.sub },
  returnRequest: {
    create: mocks.create,
    findFirst: mocks.ret,
    update: mocks.retUpdate,
  },
  returnItem: { findUnique: mocks.returnItem, update: vi.fn() },
  product: { update: mocks.product },
  productVariant: { update: mocks.variant },
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.tx.mockImplementation((f: Function) => f(tx));
  mocks.sub.mockResolvedValue(base());
  mocks.create.mockResolvedValue({ id: "r", status: "REQUESTED" });
  mocks.vendor.mockResolvedValue({ vendorId: "v-a" });
  mocks.retUpdate.mockImplementation(({ data }: any) => data);
});
describe("Phase 3K returns", () => {
  it("enforces ownership and the 14-day window; the day-14 boundary is inclusive", async () => {
    expect(RETURN_WINDOW_DAYS).toBe(14);
    await expect(
      ReturnsRefundsService.requestReturn(
        {
          subOrderId: "s",
          userId: "c-a",
          reason: "x",
          items: [{ orderItemId: "i", quantity: 1 }],
        },
        new Date("2026-01-15T00:00:00.000Z"),
      ),
    ).resolves.toBeTruthy();
    await expect(
      ReturnsRefundsService.requestReturn(
        {
          subOrderId: "s",
          userId: "c-a",
          reason: "x",
          items: [{ orderItemId: "i", quantity: 1 }],
        },
        new Date("2026-01-15T00:00:00.001Z"),
      ),
    ).rejects.toThrow("not eligible");
    mocks.sub.mockResolvedValue(base({ order: { customerId: "c-b" } }));
    await expect(
      ReturnsRefundsService.requestReturn({
        subOrderId: "s",
        userId: "c-a",
        reason: "x",
        items: [{ orderItemId: "i", quantity: 1 }],
      }),
    ).rejects.toThrow("not eligible");
  });
  it("rejects cumulative quantities beyond purchased capacity without changing stock", async () => {
    mocks.sub.mockResolvedValue(
      base({
        returnRequests: [{ items: [{ orderItemId: "i", quantity: 3 }] }],
      }),
    );
    await expect(
      ReturnsRefundsService.requestReturn(
        {
          subOrderId: "s",
          userId: "c-a",
          reason: "x",
          items: [{ orderItemId: "i", quantity: 3 }],
        },
        new Date("2026-01-02"),
      ),
    ).rejects.toThrow("exceeds");
    expect(mocks.product).not.toHaveBeenCalled();
  });
  it("request and approval do not restock", async () => {
    await ReturnsRefundsService.requestReturn(
      {
        subOrderId: "s",
        userId: "c-a",
        reason: "x",
        items: [{ orderItemId: "i", quantity: 1 }],
      },
      new Date("2026-01-02"),
    );
    expect(mocks.product).not.toHaveBeenCalled();
    mocks.ret.mockResolvedValue({ id: "r", status: "REQUESTED" });
    await ReturnsRefundsService.approveReturn("r");
    expect(mocks.product).not.toHaveBeenCalled();
  });
  it("allows only the owning vendor to receive and restocks a product exactly once", async () => {
    mocks.ret.mockResolvedValue({
      id: "r",
      status: "APPROVED",
      items: [{ orderItemId: "i", quantity: 2 }],
    });
    mocks.returnItem.mockResolvedValue({
      id: "ri",
      quantity: 2,
      restockedAt: null,
      orderItem: { productId: "p", variantId: null },
    });
    await ReturnsRefundsService.markReturnReceived("r");
    expect(mocks.product).toHaveBeenCalledTimes(1);
    mocks.ret.mockResolvedValue({ id: "r", status: "RECEIVED", items: [] });
    await ReturnsRefundsService.markReturnReceived("r");
    expect(mocks.product).toHaveBeenCalledTimes(1);
    mocks.ret.mockResolvedValue(null);
    await expect(
      ReturnsRefundsService.markReturnReceived("other"),
    ).rejects.toThrow("not found");
  });
  it("restocks the correct variant rather than the parent product", async () => {
    mocks.ret.mockResolvedValue({
      id: "r",
      status: "APPROVED",
      items: [{ orderItemId: "i", quantity: 1 }],
    });
    mocks.returnItem.mockResolvedValue({
      id: "ri",
      quantity: 1,
      restockedAt: null,
      orderItem: { productId: "p", variantId: "variant" },
    });
    await ReturnsRefundsService.markReturnReceived("r");
    expect(mocks.variant).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "variant" } }),
    );
    expect(mocks.product).not.toHaveBeenCalled();
  });
});
