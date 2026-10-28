import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  verifyToken: vi.fn(),
}));

vi.mock("@/lib/auth/jwt", () => ({ verifyToken: mocks.verifyToken }));

import { proxy } from "@/proxy";

function guestRequest(pathname: string, method = "GET") {
  return new NextRequest(`https://smartduka.test${pathname}`, { method });
}

function bearerRequest(pathname: string, authorization: string, method = "GET") {
  return new NextRequest(`https://smartduka.test${pathname}`, {
    method,
    headers: {
      authorization,
      "x-marketplace-user-id": "forged-user",
      "x-marketplace-platform-role": "SUPER_ADMIN",
    },
  });
}

describe("public V1 marketplace catalogue reads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyToken.mockResolvedValue(null);
  });

  it.each([
    "/api/v1/products",
    "/api/v1/products/product-id",
    "/api/v1/categories",
    "/api/v1/marketplace/home",
    "/api/marketing/HOMEPAGE",
  ])("allows a guest GET to %s without creating a session context", async (pathname) => {
    const response = await proxy(guestRequest(pathname));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(mocks.verifyToken).not.toHaveBeenCalled();
  });

  it.each(["POST", "PATCH", "DELETE"])("rejects a guest %s product mutation", async (method) => {
    const response = await proxy(guestRequest("/api/v1/products/product-id", method));

    expect(response.status).toBe(401);
  });

  it("rejects a guest POST to the products collection", async () => {
    const response = await proxy(guestRequest("/api/v1/products", "POST"));

    expect(response.status).toBe(401);
  });

  it("rejects an unrelated protected V1 route", async () => {
    const response = await proxy(guestRequest("/api/v1/orders"));

    expect(response.status).toBe(401);
  });

  it("does not treat similarly named V1 routes as public", async () => {
    const response = await proxy(guestRequest("/api/v1/products-private"));

    expect(response.status).toBe(401);
  });

  it("keeps admin marketing and non-canonical placement paths protected", async () => {
    for (const pathname of [
      "/api/admin/marketing/promotions",
      "/api/marketing/homepage",
      "/api/marketing/HOMEPAGE/private",
    ]) {
      const response = await proxy(guestRequest(pathname));
      expect(response.status).toBe(401);
    }
  });

  it("keeps the existing Pesapal webhook exemption intact", async () => {
    const response = await proxy(guestRequest("/api/webhooks/pesapal", "POST"));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("passes an audited native Bearer request to the me route", async () => {
    const response = await proxy(
      bearerRequest("/api/v1/me", "Bearer firebase-id-token"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("x-middleware-request-authorization")).toBe(
      "Bearer firebase-id-token",
    );
    expect(
      response.headers.get("x-middleware-request-x-marketplace-user-id"),
    ).toBeNull();
    expect(
      response.headers.get("x-middleware-request-x-marketplace-platform-role"),
    ).toBeNull();
    expect(mocks.verifyToken).not.toHaveBeenCalled();
  });

  it.each([
    ["GET", "/api/v1/wishlist"],
    ["POST", "/api/v1/wishlist"],
    ["DELETE", "/api/v1/wishlist/product-1"],
  ])("passes audited native wishlist %s requests", async (method, pathname) => {
    const response = await proxy(
      bearerRequest(pathname, "Bearer firebase-id-token", method),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("x-middleware-request-authorization")).toBe(
      "Bearer firebase-id-token",
    );
    expect(
      response.headers.get("x-middleware-request-x-marketplace-user-id"),
    ).toBeNull();
  });

  it("does not pass native Bearer access to wishlist-like routes", async () => {
    for (const [method, pathname] of [
      ["PATCH", "/api/v1/wishlist"],
      ["DELETE", "/api/v1/wishlist"],
      ["GET", "/api/v1/wishlist-private"],
      ["DELETE", "/api/v1/wishlist/product-1/history"],
    ]) {
      const response = await proxy(
        bearerRequest(pathname, "Bearer firebase-id-token", method),
      );
      expect(response.status).toBe(401);
    }
  });

  it.each([
    ["GET", "/api/v1/addresses"],
    ["POST", "/api/v1/addresses"],
    ["PATCH", "/api/v1/addresses/address-1"],
    ["DELETE", "/api/v1/addresses/address-1"],
    ["POST", "/api/v1/addresses/address-1/default"],
  ])("passes only audited native address %s requests", async (method, pathname) => {
    const response = await proxy(bearerRequest(pathname, "Bearer firebase-id-token", method));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it.each([
    ["GET", "/api/v1/recommendations"],
    ["GET", "/api/v1/recently-viewed"],
    ["POST", "/api/v1/recently-viewed"],
    ["GET", "/api/v1/orders"],
    ["GET", "/api/v1/orders/order-1"],
  ])("passes audited native customer %s requests", async (method, pathname) => {
    const response = await proxy(
      bearerRequest(pathname, "Bearer firebase-id-token", method),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("x-middleware-request-authorization")).toBe(
      "Bearer firebase-id-token",
    );
  });

  it.each([
    ["POST", "/api/v1/recommendations"],
    ["DELETE", "/api/v1/recently-viewed"],
    ["POST", "/api/v1/orders"],
    ["GET", "/api/v1/orders/order-1/payments"],
  ])("keeps unsupported native customer %s routes blocked", async (method, pathname) => {
    const response = await proxy(
      bearerRequest(pathname, "Bearer firebase-id-token", method),
    );
    expect(response.status).toBe(401);
  });

  it.each([
    ["PUT", "/api/v1/addresses/address-1"],
    ["DELETE", "/api/v1/addresses"],
    ["GET", "/api/v1/addresses-private"],
    ["POST", "/api/v1/addresses/address-1/history"],
  ])("keeps unsupported native address %s routes blocked", async (method, pathname) => {
    const response = await proxy(bearerRequest(pathname, "Bearer firebase-id-token", method));
    expect(response.status).toBe(401);
  });

  it.each(["", "Bearer", "Bearer   ", "Basic credentials", "token-only"])(
    "rejects malformed native authorization %j",
    async (authorization) => {
      const response = await proxy(
        bearerRequest("/api/v1/me", authorization),
      );

      expect(response.status).toBe(401);
    },
  );

  it("does not pass Bearer credentials through on non-approved routes", async () => {
    const response = await proxy(
      bearerRequest("/api/v1/orders-private", "Bearer firebase-id-token"),
    );

    expect(response.status).toBe(401);
  });

  it("preserves an existing valid browser-cookie session", async () => {
    mocks.verifyToken.mockResolvedValue({
      userId: "user-a",
      email: "buyer@example.test",
      platformRole: "CUSTOMER",
      vendorRole: null,
      vendorId: null,
    });
    const response = await proxy(
      new NextRequest("https://smartduka.test/api/v1/me", {
        headers: { cookie: "marketplace_access_token=valid-session" },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(mocks.verifyToken).toHaveBeenCalledWith("valid-session");
  });
});
