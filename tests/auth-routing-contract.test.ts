import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { authorizedRedirectPath, safeRedirectPath } from "@/lib/auth/redirect-destination";

const mocks = vi.hoisted(() => ({ verifyToken: vi.fn() }));
vi.mock("@/lib/auth/jwt", () => ({ verifyToken: mocks.verifyToken }));
import { proxy } from "@/proxy";

const request = (path: string, authenticated = true) => new NextRequest(`https://mwezora.test${path}`, {
  headers: authenticated ? { cookie: "session=valid" } : undefined,
});

describe("authentication routing contract", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(["CUSTOMER", "VENDOR", "ADMIN", "SUPER_ADMIN"])("sends an authenticated %s login visit to the marketplace by default", async (platformRole) => {
    mocks.verifyToken.mockResolvedValue({ userId: "user-1", platformRole });
    expect((await proxy(request("/login"))).headers.get("location")).toBe("https://mwezora.test/");
  });

  it("preserves an explicit checkout destination including its query", async () => {
    mocks.verifyToken.mockResolvedValue(null);
    const response = await proxy(request("/checkout?step=payment", false));
    expect(response.headers.get("location")).toBe("https://mwezora.test/login?callbackUrl=%2Fcheckout%3Fstep%3Dpayment");
  });

  it("respects authorized explicit dashboards without making roles login destinations", async () => {
    mocks.verifyToken.mockResolvedValue({ userId: "vendor-1", platformRole: "VENDOR" });
    expect((await proxy(request("/login?callbackUrl=%2Fvendor%2Fproducts"))).headers.get("location")).toBe("https://mwezora.test/vendor/products");
    mocks.verifyToken.mockResolvedValue({ userId: "admin-1", platformRole: "ADMIN" });
    expect((await proxy(request("/login?callbackUrl=%2Fadmin%2Fvendors"))).headers.get("location")).toBe("https://mwezora.test/admin/vendors");
  });

  it("rejects unauthorized and open-redirect destinations", () => {
    expect(authorizedRedirectPath("/admin", { platformRole: "CUSTOMER" })).toBeNull();
    expect(authorizedRedirectPath("/vendor", { platformRole: "ADMIN" })).toBeNull();
    for (const value of ["https://evil.test", "//evil.test", "/\\evil.test", "/%5cevil.test", "/%2f%2fevil.test", "/login"]) {
      expect(safeRedirectPath(value)).toBeNull();
    }
  });

  it("returns unauthorized users to the marketplace instead of another privileged workspace", async () => {
    mocks.verifyToken.mockResolvedValue({ userId: "vendor-1", platformRole: "VENDOR" });
    expect((await proxy(request("/admin"))).headers.get("location")).toBe("https://mwezora.test/");
  });
});
