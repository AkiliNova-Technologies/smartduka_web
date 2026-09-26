import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyToken: vi.fn(),
  findUnique: vi.fn(),
  cookieGet: vi.fn(),
  requestHeaders: vi.fn(),
}));
vi.mock("next/headers", () => ({
  headers: mocks.requestHeaders,
  cookies: async () => ({ get: mocks.cookieGet }),
}));
vi.mock("@/lib/auth/jwt", () => ({ verifyToken: mocks.verifyToken }));
vi.mock("@/lib/prisma/client", () => ({
  prisma: { user: { findUnique: mocks.findUnique } },
}));

import {
  AccountInactiveError,
  AuthenticationRequiredError,
  requireActiveUserId,
} from "@/lib/auth/session";

describe("active account session enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requestHeaders.mockResolvedValue(new Headers());
    mocks.cookieGet.mockReturnValue({ value: "valid-token" });
    mocks.verifyToken.mockResolvedValue({
      userId: "user-a",
      email: "a@example.test",
      vendorId: "vendor-old",
      vendorRole: "OWNER",
      platformRole: "ADMIN",
    });
  });

  it("accepts only an active current user, regardless of stale token role claims", async () => {
    mocks.findUnique.mockResolvedValue({ status: "ACTIVE" });
    await expect(requireActiveUserId()).resolves.toBe("user-a");
    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { id: "user-a" },
      select: { status: true },
    });
  });

  it("rejects suspended and deleted users with valid signed-session identity", async () => {
    mocks.findUnique.mockResolvedValueOnce({ status: "SUSPENDED" });
    await expect(requireActiveUserId()).rejects.toBeInstanceOf(
      AccountInactiveError,
    );
    mocks.findUnique.mockResolvedValueOnce(null);
    await expect(requireActiveUserId()).rejects.toBeInstanceOf(
      AccountInactiveError,
    );
  });

  it("treats an invalid session cookie as unauthenticated", async () => {
    mocks.verifyToken.mockResolvedValue(null);
    await expect(requireActiveUserId()).rejects.toBeInstanceOf(
      AuthenticationRequiredError,
    );
  });
});
