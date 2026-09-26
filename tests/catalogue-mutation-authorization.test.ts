import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireVendorContext: vi.fn(),
  requireAdminContext: vi.fn(),
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {},
  VendorAuthorizationError: class VendorAuthorizationError extends Error {},
  productFindFirst: vi.fn(),
  productFindUnique: vi.fn(),
  transaction: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  getAllProducts: vi.fn(),
  getPublicProductById: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  getAllCategories: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({
  AuthenticationRequiredError: mocks.AuthenticationRequiredError,
}));
vi.mock("@/lib/auth/vendor-context", () => ({
  VendorAuthorizationError: mocks.VendorAuthorizationError,
  requireVendorContext: mocks.requireVendorContext,
}));
vi.mock("@/lib/auth/admin-context", () => ({
  requireAdminContext: mocks.requireAdminContext,
}));
vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    product: {
      findFirst: mocks.productFindFirst,
      findUnique: mocks.productFindUnique,
    },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/services/product", () => ({
  ProductService: {
    createProduct: mocks.createProduct,
    updateProduct: mocks.updateProduct,
    deleteProduct: mocks.deleteProduct,
    getAllProducts: mocks.getAllProducts,
    getPublicProductById: mocks.getPublicProductById,
  },
}));
vi.mock("@/services/category", () => ({
  CategoryService: {
    createCategoryWithSubs: mocks.createCategory,
    updateCategory: mocks.updateCategory,
    deleteCategory: mocks.deleteCategory,
    getAllCategories: mocks.getAllCategories,
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import * as productsRoute from "@/app/api/products/route";
import * as productRoute from "@/app/api/products/[id]/route";
import { createCategoryAction } from "@/actions/category";
import * as categoriesRoute from "@/app/api/categories/route";

const vendorA = {
  vendorId: "vendor-a",
  vendorRole: "OWNER",
  user: { id: "vendor-user", vendorRole: "OWNER" },
  vendor: {
    id: "vendor-a",
    ownerId: "vendor-user",
    slug: "a",
    status: "ACTIVE",
  },
};
const request = (body?: unknown) =>
  new Request("http://smartduka.test/api/products", {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

describe("catalogue mutation authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireVendorContext.mockResolvedValue(vendorA);
  });

  it("returns 401 for anonymous product creation and 403 for authenticated non-vendors", async () => {
    mocks.requireVendorContext.mockRejectedValueOnce(
      new mocks.AuthenticationRequiredError("Unauthorized"),
    );
    expect(
      (
        await productsRoute.POST(
          request({ name: "X", slug: "x", basePrice: 1 }) as never,
        )
      ).status,
    ).toBe(401);
    mocks.requireVendorContext.mockRejectedValueOnce(
      new mocks.VendorAuthorizationError("Denied"),
    );
    expect(
      (
        await productsRoute.POST(
          request({ name: "X", slug: "x", basePrice: 1 }) as never,
        )
      ).status,
    ).toBe(403);
    expect(mocks.createProduct).not.toHaveBeenCalled();
  });

  it("creates only under the DB-derived Vendor A tenant despite a forged Vendor B ID", async () => {
    mocks.createProduct.mockResolvedValue({ id: "product-a" });
    const response = await productsRoute.POST(
      request({
        name: "A",
        slug: "a",
        basePrice: 20,
        vendorId: "vendor-b",
        ownerId: "owner-b",
      }) as never,
    );
    expect(response.status).toBe(201);
    expect(mocks.createProduct).toHaveBeenCalledWith(
      expect.objectContaining({ vendorId: "vendor-a", name: "A" }),
    );
  });

  it("returns 404 without mutating when Vendor A targets Vendor B product or image association", async () => {
    mocks.productFindFirst.mockResolvedValue(null);
    const update = new Request("http://smartduka.test/api/products/product-b", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "forged", images: [{ url: "x" }] }),
    });
    expect(
      (
        await productRoute.PUT(update as never, {
          params: Promise.resolve({ id: "product-b" }),
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await productRoute.DELETE(request() as never, {
          params: Promise.resolve({ id: "product-b" }),
        })
      ).status,
    ).toBe(404);
    expect(mocks.productFindFirst).toHaveBeenCalledWith({
      where: { id: "product-b", vendorId: "vendor-a" },
    });
    expect(mocks.updateProduct).not.toHaveBeenCalled();
    expect(mocks.deleteProduct).not.toHaveBeenCalled();
  });

  it("keeps public reads public but forces published/active visibility", async () => {
    mocks.getAllProducts.mockResolvedValue([]);
    mocks.getPublicProductById.mockResolvedValue(null);
    expect(
      (
        await productsRoute.GET({
          nextUrl: new URL("http://smartduka.test/api/products?status=DRAFT"),
        } as never)
      ).status,
    ).toBe(200);
    expect(mocks.getAllProducts).toHaveBeenCalledWith(
      expect.objectContaining({ status: ["ACTIVE", "PUBLISHED"] }),
    );
    expect(
      (
        await productRoute.GET(request() as never, {
          params: Promise.resolve({ id: "draft" }),
        })
      ).status,
    ).toBe(404);
    expect(mocks.getPublicProductById).toHaveBeenCalledWith("draft");
  });

  it("keeps category reads public", async () => {
    mocks.getAllCategories.mockResolvedValue([]);
    expect(
      (
        await categoriesRoute.GET({
          nextUrl: new URL("http://smartduka.test/api/categories"),
        } as never)
      ).status,
    ).toBe(200);
  });

  it("requires platform management for global category writes", async () => {
    mocks.requireAdminContext.mockRejectedValueOnce(
      new Error("Administrative permission denied."),
    );
    await expect(
      createCategoryAction({
        name: "Category",
        slug: "category",
        description: "",
        image: "",
        subCategories: [],
      }),
    ).resolves.toMatchObject({ success: false });
    expect(mocks.createCategory).not.toHaveBeenCalled();
    mocks.requireAdminContext.mockResolvedValueOnce({
      userId: "super",
      platformRole: "SUPER_ADMIN",
    });
    await expect(
      createCategoryAction({
        name: "Category",
        slug: "category",
        description: "",
        image: "",
        subCategories: [],
      }),
    ).resolves.toMatchObject({ success: true });
    expect(mocks.requireAdminContext).toHaveBeenLastCalledWith(
      "platform:manage",
    );
  });
});
