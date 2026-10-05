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

  it("keeps the existing Pesapal webhook exemption intact", async () => {
    const response = await proxy(guestRequest("/api/webhooks/pesapal", "POST"));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
