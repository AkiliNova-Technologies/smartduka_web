import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUserId: vi.fn(),
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
  getWishlist: vi.fn(),
  addToWishlist: vi.fn(),
  getRecentlyViewed: vi.fn(),
  mergeGuestViews: vi.fn(),
  getUserOrders: vi.fn(),
  createOrder: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  AuthenticationRequiredError: Error,
  getCurrentUserId: mocks.getCurrentUserId,
  requireActiveUserId: mocks.getCurrentUserId,
}));
vi.mock("@/services/settings", () => ({
  SettingsService: {
    getSettings: mocks.getSettings,
    updateSettings: mocks.updateSettings,
  },
  sanitizeUserSettingsPayload: (input: unknown) => input,
  UserSettingsPayloadError: class UserSettingsPayloadError extends Error {},
}));
vi.mock("@/services/wishlist", () => ({
  WishlistService: {
    getUserWishlist: mocks.getWishlist,
    addToWishlist: mocks.addToWishlist,
  },
}));
vi.mock("@/services/recently-viewed", () => ({
  RecentlyViewedService: {
    getRecentlyViewed: mocks.getRecentlyViewed,
    mergeGuestViews: mocks.mergeGuestViews,
  },
}));
vi.mock("@/services/order", () => ({
  OrderService: {
    getUserOrders: mocks.getUserOrders,
    createOrder: mocks.createOrder,
  },
}));

import * as settingsRoute from "@/app/api/settings/route";
import * as wishlistRoute from "@/app/api/wishlist/route";
import * as recentlyViewedRoute from "@/app/api/recently-viewed/route";
import * as recentlyViewedMergeRoute from "@/app/api/recently-viewed/merge/route";
import * as ordersRoute from "@/app/api/orders/route";

const request = (body: unknown) =>
  new Request("http://smartduka.test/api", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-marketplace-user-id": "user-b",
    },
    body: JSON.stringify(body),
  });

describe("customer route ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUserId.mockResolvedValue("user-a");
  });

  it("scopes settings reads and updates to the session user despite a forged header/body identity", async () => {
    mocks.getSettings.mockResolvedValue({ userId: "user-a" });
    mocks.updateSettings.mockResolvedValue({ userId: "user-a" });

    await settingsRoute.GET(request({ userId: "user-b" }) as never);
    await settingsRoute.PATCH(request({ fullName: "A" }) as never);

    expect(mocks.getSettings).toHaveBeenCalledWith("user-a");
    expect(mocks.updateSettings).toHaveBeenCalledWith("user-a", {
      fullName: "A",
    });
  });

  it("returns 401 when no authenticated session is available", async () => {
    mocks.getCurrentUserId.mockRejectedValue(
      new Error("Unauthorized: No authenticated session found."),
    );

    const response = await settingsRoute.GET(request({}) as never);

    expect(response.status).toBe(401);
  });

  it("scopes wishlist and recently-viewed operations to the session user", async () => {
    mocks.getWishlist.mockResolvedValue([]);
    mocks.addToWishlist.mockResolvedValue({});
    mocks.getRecentlyViewed.mockResolvedValue([]);

    await wishlistRoute.GET();
    await wishlistRoute.POST(
      request({ userId: "user-b", productId: "product-1" }) as never,
    );
    await recentlyViewedRoute.GET();
    await recentlyViewedMergeRoute.POST(
      request({ userId: "user-b", productIds: ["product-1"] }) as never,
    );

    expect(mocks.getWishlist).toHaveBeenCalledWith("user-a");
    expect(mocks.addToWishlist).toHaveBeenCalledWith("user-a", "product-1");
    expect(mocks.getRecentlyViewed).toHaveBeenCalledWith("user-a");
    expect(mocks.mergeGuestViews).toHaveBeenCalledWith("user-a", ["product-1"]);
  });

  it("uses the session user as the customer when creating and retrieving orders", async () => {
    mocks.getUserOrders.mockResolvedValue([]);
    mocks.createOrder.mockResolvedValue({
      id: "order-1",
      customerId: "user-a",
    });

    await ordersRoute.GET();
    await ordersRoute.POST(
      request({
        customerId: "user-b",
        userId: "user-b",
        items: [],
        shippingAddress: "Address",
        shippingPhone: "0700000000",
        paymentGateway: "CASH_ON_DELIVERY",
      }) as never,
    );

    expect(mocks.getUserOrders).toHaveBeenCalledWith("user-a");
    expect(mocks.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-a" }),
    );
  });
});
