import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class AuthenticationRequiredError extends Error {}
  class VendorAuthorizationError extends Error {}
  return {
    AuthenticationRequiredError, VendorAuthorizationError,
    context: vi.fn(), upload: vi.fn(), dashboard: vi.fn(), analytics: vi.fn(), shopGet: vi.fn(), shopUpdate: vi.fn(),
    catalogueList: vi.fn(), catalogueDetail: vi.fn(), catalogueExists: vi.fn(), mutationDto: vi.fn((product) => product), productCreate: vi.fn(), productUpdate: vi.fn(),
    inventoryList: vi.fn(), inventoryAdjust: vi.fn(), deviceList: vi.fn(), deviceRegister: vi.fn(), deviceRemove: vi.fn(),
    orders: vi.fn(), activeUser: vi.fn(), asset: vi.fn(),
  };
});

vi.mock("@/lib/auth/vendor-context", () => ({ requireVendorContext: mocks.context, VendorAuthorizationError: mocks.VendorAuthorizationError }));
vi.mock("@/lib/auth/session", () => ({ requireActiveUserId: mocks.activeUser, AuthenticationRequiredError: mocks.AuthenticationRequiredError, AccountInactiveError: class AccountInactiveError extends Error {} }));
vi.mock("@/services/vendor-upload-authorization", () => ({ VendorUploadAuthorizationService: { authorize: mocks.upload } }));
vi.mock("@/services/vendor-mobile-insights", () => ({ VendorMobileInsightsService: { dashboard: mocks.dashboard, analytics: mocks.analytics } }));
vi.mock("@/services/vendor-mobile-shop", () => ({ VendorMobileShopService: { get: mocks.shopGet, update: mocks.shopUpdate } }));
vi.mock("@/services/vendor-mobile-catalog", () => ({ VendorMobileCatalogService: { list: mocks.catalogueList, detail: mocks.catalogueDetail, exists: mocks.catalogueExists, mutationDto: mocks.mutationDto } }));
vi.mock("@/services/product", () => ({ ProductService: { createProduct: mocks.productCreate, updateProduct: mocks.productUpdate } }));
vi.mock("@/services/vendor-inventory", () => ({ VendorInventoryService: { list: mocks.inventoryList, adjust: mocks.inventoryAdjust } }));
vi.mock("@/services/user-devices", () => ({ UserDeviceService: { list: mocks.deviceList, register: mocks.deviceRegister, remove: mocks.deviceRemove } }));
vi.mock("@/services/order", () => ({ OrderService: { getUserOrders: mocks.orders } }));
vi.mock("@/lib/api/v1/vendor-assets", () => ({ resolveVendorAssetRef: mocks.asset }));

import * as uploads from "@/app/api/v1/uploads/route";
import * as dashboard from "@/app/api/v1/vendor/dashboard/route";
import * as analytics from "@/app/api/v1/vendor/analytics/route";
import * as shop from "@/app/api/v1/vendor/shop/route";
import * as products from "@/app/api/v1/vendor/products/route";
import * as product from "@/app/api/v1/vendor/products/[id]/route";
import * as inventory from "@/app/api/v1/vendor/inventory/route";
import * as adjustments from "@/app/api/v1/vendor/inventory/adjustments/route";
import * as paymentStatus from "@/app/api/v1/orders/[id]/payment-status/route";
import * as devices from "@/app/api/v1/devices/route";
import * as device from "@/app/api/v1/devices/[id]/route";

const context = { vendorId: "vendor-a", user: { id: "user-a", vendorRole: "OWNER" }, vendor: { id: "vendor-a" } };
const request = (url: string, init?: RequestInit) => Object.assign(new Request(url, init), { nextUrl: new URL(url) });
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const json = (body: unknown) => ({ method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.context.mockResolvedValue(context); mocks.activeUser.mockResolvedValue("user-a");
  mocks.asset.mockImplementation((ref: string, vendorId: string) => {
    if (!ref.includes(`/${vendorId}/`)) { const error = new Error("Asset reference is not authorized for this shop."); Object.assign(error, { code: "INVALID_ASSET_REFERENCE" }); throw error; }
    return "https://cdn.example/image";
  });
});

describe("V1 mobile route adapters", () => {
  it("authorizes vendor-scoped uploads without accepting caller paths or leaking credentials", async () => {
    mocks.upload.mockResolvedValue({ assetRef: "storage://marketplace-media/products/vendor-a/draft/a.jpg", path: "products/vendor-a/draft/a.jpg", token: "short-lived", uploadUrl: "https://upload", method: "PUT", expiresIn: 60 });
    const response = await uploads.POST(request("http://localhost/api/v1/uploads", json({ purpose: "PRODUCT_IMAGE", mimeType: "image/jpeg", size: 100 })));
    expect(response.status).toBe(200); expect(mocks.context).toHaveBeenCalledWith("vendor:manage_products"); expect(mocks.upload).toHaveBeenCalledWith("vendor-a", expect.not.objectContaining({ path: expect.anything(), bucket: expect.anything() }));
    const body = await response.json(); expect(body.data.assetRef).toContain("products/vendor-a/"); expect(JSON.stringify(body)).not.toMatch(/service.role|secret|admin/i);
    const invalid = await uploads.POST(request("http://localhost/api/v1/uploads", json({ purpose: "PRODUCT_IMAGE", mimeType: "image/gif", size: 6_000_000, path: "elsewhere" })));
    expect(invalid.status).toBe(400); expect(await invalid.json()).toHaveProperty("error.code", "VALIDATION_ERROR");
  });

  it("maps vendor dashboard and analytics auth, parsing, defaults, and envelopes", async () => {
    mocks.dashboard.mockResolvedValue({ summary: { todayRevenue: 2 }, recentOrders: [], lowStockItems: [] }); mocks.analytics.mockResolvedValue({ period: "7D", revenue: 2, topProducts: [] });
    expect(await (await dashboard.GET()).json()).toEqual({ data: expect.objectContaining({ summary: expect.any(Object) }) });
    const analytic = await analytics.GET(request("http://localhost/api/v1/vendor/analytics?period=TODAY") as never); expect(analytic.status).toBe(200); expect(mocks.analytics).toHaveBeenCalledWith("TODAY");
    await analytics.GET(request("http://localhost/api/v1/vendor/analytics") as never); expect(mocks.analytics).toHaveBeenLastCalledWith("7D");
    const invalid = await analytics.GET(request("http://localhost/api/v1/vendor/analytics?period=90D") as never); expect(invalid.status).toBe(400); expect(await invalid.json()).toHaveProperty("error.code", "VALIDATION_ERROR");
    mocks.dashboard.mockRejectedValueOnce(new mocks.VendorAuthorizationError()); const denied = await dashboard.GET(); expect(denied.status).toBe(403); expect(await denied.json()).toHaveProperty("error.code", "VENDOR_ACCESS_DENIED");
  });

  it("uses server vendor context for shop reads and only allows public mutable fields", async () => {
    mocks.shopGet.mockResolvedValue({ id: "vendor-a", storeName: "A" }); mocks.shopUpdate.mockResolvedValue({ id: "vendor-a", storeName: "Changed" });
    expect(await (await shop.GET()).json()).toEqual({ data: { id: "vendor-a", storeName: "A" } });
    const changed = await shop.PATCH(request("http://localhost/api/v1/vendor/shop", { method: "PATCH", body: JSON.stringify({ storeName: "Changed", logoUrl: "storage://marketplace-media/shops/vendor-a/logo.png" }) })); expect(changed.status).toBe(200); expect(mocks.shopUpdate).toHaveBeenCalledWith("vendor-a", expect.objectContaining({ logoUrl: "https://cdn.example/image" }));
    const injected = await shop.PATCH(request("http://localhost/api/v1/vendor/shop", { method: "PATCH", body: JSON.stringify({ vendorId: "vendor-b" }) })); expect(injected.status).toBe(400); expect(await injected.json()).toHaveProperty("error.code", "VALIDATION_ERROR");
    const foreign = await shop.PATCH(request("http://localhost/api/v1/vendor/shop", { method: "PATCH", body: JSON.stringify({ logoUrl: "storage://marketplace-media/shops/vendor-b/logo.png" }) })); expect(foreign.status).toBe(400); expect(await foreign.json()).toHaveProperty("error.code", "INVALID_ASSET_REFERENCE");
  });

  it("delegates vendor product list, detail, create and patch with tenant-safe DTOs", async () => {
    mocks.catalogueList.mockResolvedValue({ data: [{ id: "p-a", name: "Tea" }], total: 7 }); mocks.catalogueDetail.mockResolvedValue({ id: "p-a", name: "Tea", basePrice: 2, variants: [] }); mocks.catalogueExists.mockResolvedValue(true); mocks.productCreate.mockResolvedValue({ id: "p-new" }); mocks.productUpdate.mockResolvedValue({ id: "p-a", name: "New" });
    const list = await products.GET(request("http://localhost/api/v1/vendor/products?page=2&pageSize=3&q=tea") as never); expect(await list.json()).toEqual({ data: [{ id: "p-a", name: "Tea" }], meta: { page: 2, pageSize: 3, total: 7, hasMore: true } }); expect(mocks.catalogueList).toHaveBeenCalledWith("vendor-a", expect.objectContaining({ page: 2, pageSize: 3, search: "tea" }));
    expect(await (await product.GET(new Request("http://localhost"), params("p-a"))).json()).toEqual({ data: expect.objectContaining({ id: "p-a" }) });
    mocks.catalogueDetail.mockResolvedValueOnce(null); expect((await product.GET(new Request("http://localhost"), params("other-vendor-product"))).status).toBe(404);
    const create = await products.POST(request("http://localhost/api/v1/vendor/products", json({ name: "Tea", slug: "tea", basePrice: 2, images: [{ assetRef: "storage://marketplace-media/products/vendor-a/draft/a.jpg" }] })) as never); expect(create.status).toBe(201); expect(mocks.productCreate).toHaveBeenCalledWith(expect.objectContaining({ vendorId: "vendor-a" }));
    const badCreate = await products.POST(request("http://localhost/api/v1/vendor/products", json({ name: "Tea", slug: "tea", basePrice: -1, vendorId: "vendor-b" })) as never); expect(badCreate.status).toBe(400);
    const update = await product.PATCH(request("http://localhost/api/v1/vendor/products/p-a", { method: "PATCH", body: JSON.stringify({ name: "New" }) }), params("p-a")); expect(update.status).toBe(200); expect(mocks.productUpdate).toHaveBeenCalledWith(expect.objectContaining({ id: "p-a" }));
    const protectedUpdate = await product.PATCH(request("http://localhost/api/v1/vendor/products/p-a", { method: "PATCH", body: JSON.stringify({ ownerId: "x" }) }), params("p-a")); expect(protectedUpdate.status).toBe(400);
  });

  it("validates inventory queries and mutations while retaining service totals and variant IDs", async () => {
    mocks.inventoryList.mockResolvedValue({ data: [{ productId: "p" }], total: 9 }); mocks.inventoryAdjust.mockResolvedValue({ productId: "p", variantId: "00000000-0000-4000-8000-000000000001", stock: 4 });
    const listed = await inventory.GET(request("http://localhost/api/v1/vendor/inventory?page=2&pageSize=4&q=tea&lowStockOnly=true") as never); expect(await listed.json()).toEqual({ data: [{ productId: "p" }], meta: { page: 2, pageSize: 4, total: 9, hasMore: true } });
    const adjusted = await adjustments.POST(request("http://localhost/api/v1/vendor/inventory/adjustments", json({ productId: "00000000-0000-4000-8000-000000000000", variantId: "00000000-0000-4000-8000-000000000001", operation: "INCREMENT", quantity: 1, reason: "RESTOCK" }))); expect(adjusted.status).toBe(200); expect(mocks.inventoryAdjust).toHaveBeenCalledWith(expect.objectContaining({ variantId: "00000000-0000-4000-8000-000000000001" }));
    const invalid = await adjustments.POST(request("http://localhost/api/v1/vendor/inventory/adjustments", json({ operation: "BAD" }))); expect(invalid.status).toBe(400); expect(await invalid.json()).toHaveProperty("error.code", "VALIDATION_ERROR");
  });

  it("normalizes payment status and isolates devices through their canonical services", async () => {
    mocks.orders.mockResolvedValue([{ id: "order-a", paymentStatus: "COMPLETED", status: "PAID", createdAt: "now" }]);
    expect(await (await paymentStatus.GET(new Request("http://localhost"), params("order-a"))).json()).toEqual({ data: { status: "SUCCEEDED", orderStatus: "PAID", updatedAt: "now", canRetry: false } });
    expect((await paymentStatus.GET(new Request("http://localhost"), params("other-order"))).status).toBe(404);
    mocks.deviceRegister.mockResolvedValue({ id: "device-a", platform: "ANDROID" }); mocks.deviceList.mockResolvedValue([{ id: "device-a", platform: "ANDROID" }]);
    const registered = await devices.POST(request("http://localhost/api/v1/devices", json({ deviceId: "abcdefgh", platform: "ANDROID", pushToken: "x".repeat(20) }))); expect(registered.status).toBe(201); expect(await (await devices.GET()).json()).toEqual({ data: [{ id: "device-a", platform: "ANDROID" }] });
    await device.DELETE(new Request("http://localhost"), params("device-a")); expect(mocks.deviceRemove).toHaveBeenCalledWith("device-a");
    mocks.deviceList.mockRejectedValueOnce(new mocks.AuthenticationRequiredError()); const unauthenticated = await devices.GET(); expect(unauthenticated.status).toBe(401); expect(await unauthenticated.json()).toHaveProperty("error.code", "UNAUTHENTICATED");
  });
});
