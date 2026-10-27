import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireActiveUserId: vi.fn(),
  getUserWishlist: vi.fn(),
  addToWishlist: vi.fn(),
  removeFromWishlist: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {},
  AccountInactiveError: class AccountInactiveError extends Error {},
  requireActiveUserId: mocks.requireActiveUserId,
}));
vi.mock("@/services/wishlist", () => ({
  WishlistService: {
    getUserWishlist: mocks.getUserWishlist,
    addToWishlist: mocks.addToWishlist,
    removeFromWishlist: mocks.removeFromWishlist,
  },
}));

import * as collection from "@/app/api/v1/wishlist/route";
import * as item from "@/app/api/v1/wishlist/[productId]/route";

describe("V1 wishlist route authorization and idempotency contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireActiveUserId.mockResolvedValue("user-a");
    mocks.getUserWishlist.mockResolvedValue([]);
    mocks.addToWishlist.mockResolvedValue({});
    mocks.removeFromWishlist.mockResolvedValue({ count: 0 });
  });

  it("always scopes reads and writes to the server-resolved user", async () => {
    await collection.GET();
    await collection.POST(
      new Request("https://smartduka.test/api/v1/wishlist", {
        method: "POST",
        headers: { "content-type": "application/json", "x-marketplace-user-id": "user-b" },
        body: JSON.stringify({ productId: "product-1", userId: "user-b" }),
      }),
    );
    await item.DELETE(new Request("https://smartduka.test"), {
      params: Promise.resolve({ productId: "product-1" }),
    });

    expect(mocks.getUserWishlist).toHaveBeenCalledWith("user-a");
    expect(mocks.addToWishlist).toHaveBeenCalledWith("user-a", "product-1");
    expect(mocks.removeFromWishlist).toHaveBeenCalledWith("user-a", "product-1");
  });

  it("preserves idempotent duplicate add and repeated remove responses", async () => {
    const add = await collection.POST(
      new Request("https://smartduka.test/api/v1/wishlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: "product-1" }),
      }),
    );
    const remove = await item.DELETE(new Request("https://smartduka.test"), {
      params: Promise.resolve({ productId: "product-1" }),
    });

    expect(add.status).toBe(201);
    expect(await add.json()).toEqual({ data: { productId: "product-1", wishlisted: true } });
    expect(remove.status).toBe(200);
    expect(await remove.json()).toEqual({ data: { productId: "product-1", wishlisted: false } });
  });

  it("rejects invalid product IDs before calling the service", async () => {
    const response = await collection.POST(
      new Request("https://smartduka.test/api/v1/wishlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: "" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.addToWishlist).not.toHaveBeenCalled();
  });
});
