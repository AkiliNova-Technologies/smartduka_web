import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireVendorContext: vi.fn(),
  findUnique: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("@/lib/auth/vendor-context", () => ({
  requireVendorContext: mocks.requireVendorContext,
}));
vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    product: { findUnique: mocks.findUnique },
    $transaction: mocks.transaction,
  },
}));

import { createVendorProduct } from "@/actions/vendor-catalog";

const context = {
  vendorId: "vendor-a",
  vendorRole: "OWNER",
  user: { id: "user-a", vendorRole: "OWNER" },
  vendor: { id: "vendor-a", ownerId: "user-a", slug: "a", status: "ACTIVE" },
};

describe("vendor catalogue nested ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireVendorContext.mockResolvedValue(context);
    mocks.findUnique.mockResolvedValue(null);
  });

  it("associates variants and images only with the derived vendor product", async () => {
    const create = vi.fn().mockResolvedValue({ id: "product-a", slug: "a" });
    const audit = vi.fn();
    mocks.transaction.mockImplementation(async (callback) =>
      callback({ product: { create }, auditLog: { create: audit } }),
    );
    await createVendorProduct({
      name: "A",
      basePrice: 10,
      images: [{ url: "image-a", isFeatured: true, sortOrder: 0 }],
      variants: [
        {
          sku: "a-s",
          name: "Small",
          price: 10,
          inventoryCount: 2,
          options: { Size: "S" },
        },
      ],
    } as never);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          vendorId: "vendor-a",
          variants: expect.any(Object),
          images: expect.any(Object),
        }),
      }),
    );
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-a",
          vendorId: "vendor-a",
        }),
      }),
    );
  });
});
