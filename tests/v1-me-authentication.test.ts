import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireActiveUserId: vi.fn(),
  findUniqueOrThrow: vi.fn(),
}));

vi.mock("@/lib/auth/session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/session")>(
    "@/lib/auth/session",
  );
  return {
    ...actual,
    requireActiveUserId: mocks.requireActiveUserId,
  };
});

vi.mock("@/lib/prisma/client", () => ({
  prisma: { user: { findUniqueOrThrow: mocks.findUniqueOrThrow } },
}));

import {
  AccountInactiveError,
  AuthenticationRequiredError,
} from "@/lib/auth/session";
import { GET } from "@/app/api/v1/me/route";

describe("GET /api/v1/me authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the authenticated active user's existing profile contract", async () => {
    mocks.requireActiveUserId.mockResolvedValue("user-a");
    mocks.findUniqueOrThrow.mockResolvedValue({
      id: "user-a",
      name: "Buyer",
      email: "buyer@example.test",
      phone: null,
      avatarUrl: null,
      vendorId: null,
      vendorRole: null,
      vendorProfile: null,
      ownedVendor: null,
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        id: "user-a",
        name: "Buyer",
        email: "buyer@example.test",
        phone: null,
        avatarUrl: null,
        availableModes: ["CUSTOMER"],
        vendor: null,
      },
    });
    expect(mocks.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-a" } }),
    );
  });

  it("returns 401 when route-level authentication rejects the request", async () => {
    mocks.requireActiveUserId.mockRejectedValue(
      new AuthenticationRequiredError("Authentication required"),
    );

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication is required.",
      },
    });
    expect(mocks.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("returns 403 for an inactive marketplace account", async () => {
    mocks.requireActiveUserId.mockRejectedValue(
      new AccountInactiveError("Inactive account"),
    );

    const response = await GET();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: { code: "FORBIDDEN", message: "This account is inactive." },
    });
  });

  it("cannot select another user's profile from client input", async () => {
    mocks.requireActiveUserId.mockResolvedValue("authoritative-user");
    mocks.findUniqueOrThrow.mockResolvedValue({
      id: "authoritative-user",
      name: "Authoritative Buyer",
      email: "buyer@example.test",
      phone: null,
      avatarUrl: null,
      vendorId: null,
      vendorRole: null,
      vendorProfile: null,
      ownedVendor: null,
    });

    await GET();

    expect(mocks.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "authoritative-user" } }),
    );
  });
});
