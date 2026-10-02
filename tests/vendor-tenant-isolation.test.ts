import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireVendorContext: vi.fn(),
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {},
  findSubOrders: vi.fn(),
  countSubOrders: vi.fn(),
  groupSubOrders: vi.fn(),
  updateSubOrderStatus: vi.fn(),
  findProduct: vi.fn(),
  findDocument: vi.fn(),
  updateVendor: vi.fn(),
}));

vi.mock("@/lib/auth/vendor-context", () => ({
  VendorAuthorizationError: class VendorAuthorizationError extends Error {},
  requireVendorContext: mocks.requireVendorContext,
}));
vi.mock("@/lib/auth/session", () => ({
  AuthenticationRequiredError: mocks.AuthenticationRequiredError,
}));
vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    subOrder: { findMany: mocks.findSubOrders, count: mocks.countSubOrders, groupBy: mocks.groupSubOrders },
    product: { findFirst: mocks.findProduct },
    document: { findFirst: mocks.findDocument },
    vendorProfile: { update: mocks.updateVendor },
  },
}));
vi.mock("@/services/order", () => ({
  OrderService: { updateSubOrderStatus: mocks.updateSubOrderStatus },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn(), updateTag: vi.fn(), cacheLife: vi.fn(), cacheTag: vi.fn() }));

import * as vendorOrdersRoute from "@/app/api/vendors/orders/route";
import * as vendorOrderRoute from "@/app/api/vendors/orders/[subOrderId]/route";
import {
  archiveVendorProduct,
  updateVendorProduct,
} from "@/actions/vendor-catalog";
import {
  deleteVendorDocument,
  updateStoreProfile,
} from "@/actions/vendor-settings";

const vendorAContext = {
  vendorId: "vendor-a",
  vendorRole: "OWNER",
  user: { id: "user-a", vendorRole: "OWNER" },
  vendor: {
    id: "vendor-a",
    ownerId: "user-a",
    slug: "vendor-a",
    status: "ACTIVE",
  },
};

describe("vendor tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireVendorContext.mockResolvedValue(vendorAContext);
    mocks.countSubOrders.mockResolvedValue(0);
    mocks.groupSubOrders.mockResolvedValue([]);
  });

  it("lists only Vendor A orders even when Vendor B is supplied in the URL", async () => {
    mocks.findSubOrders.mockResolvedValue([]);
    const response = await vendorOrdersRoute.GET(
      new Request(
        "http://smartduka.test/api/vendors/orders?vendorId=vendor-b",
      ) as never,
    );
    expect(response.status).toBe(200);
    expect(mocks.findSubOrders).toHaveBeenCalledWith(
      expect.objectContaining({ where: { vendorId: "vendor-a" } }),
    );
  });

  it("returns 401 when no authenticated session can establish a vendor context", async () => {
    mocks.requireVendorContext.mockRejectedValue(
      new mocks.AuthenticationRequiredError("Unauthorized"),
    );
    const response = await vendorOrdersRoute.GET(
      new Request("http://smartduka.test/api/vendors/orders") as never,
    );
    expect(response.status).toBe(401);
  });

  it("returns 404 for a Vendor B suborder and passes only Vendor A to the status service", async () => {
    mocks.updateSubOrderStatus.mockResolvedValue(null);
    const response = await vendorOrderRoute.PATCH(
      new Request("http://smartduka.test/api/vendors/orders/order-b", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "SHIPPED" }),
      }) as never,
      { params: Promise.resolve({ subOrderId: "order-b" }) },
    );
    expect(response.status).toBe(404);
    expect(mocks.updateSubOrderStatus).toHaveBeenCalledWith(
      "order-b",
      "SHIPPED",
      "vendor-a",
    );
  });

  it("scopes catalog update and archive lookups to Vendor A despite forged ownership fields", async () => {
    mocks.findProduct.mockResolvedValue(null);
    await expect(
      updateVendorProduct("product-b", {
        name: "Forged",
        vendorId: "vendor-b",
        requestedByUserId: "user-b",
      } as never),
    ).rejects.toThrow("isolated");
    await expect(archiveVendorProduct("product-b")).rejects.toThrow("isolated");
    expect(mocks.findProduct).toHaveBeenNthCalledWith(1, {
      where: { id: "product-b", vendorId: "vendor-a" },
    });
    expect(mocks.findProduct).toHaveBeenNthCalledWith(2, {
      where: { id: "product-b", vendorId: "vendor-a" },
    });
  });

  it("does not delete Vendor B documents and updates only Vendor A settings", async () => {
    mocks.findDocument.mockResolvedValue(null);
    await expect(deleteVendorDocument("document-b")).resolves.toEqual({
      success: false,
      error: "Document not found.",
    });
    expect(mocks.findDocument).toHaveBeenCalledWith({
      where: { id: "document-b", vendorId: "vendor-a" },
    });

    mocks.updateVendor.mockResolvedValue({ id: "vendor-a" });
    await updateStoreProfile({ storeName: "A", vendorId: "vendor-b" } as never);
    expect(mocks.updateVendor).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "vendor-a" } }),
    );
  });
});
