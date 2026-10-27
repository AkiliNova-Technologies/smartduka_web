import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  cookies: vi.fn(),
  verifyToken: vi.fn(),
  verifyIdToken: vi.fn(),
  synchronizeFirebaseIdentity: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: mocks.headers,
  cookies: mocks.cookies,
}));
vi.mock("@/lib/auth/jwt", () => ({ verifyToken: mocks.verifyToken }));
vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: { verifyIdToken: mocks.verifyIdToken },
}));
vi.mock("@/services/auth-sync", () => ({
  synchronizeFirebaseIdentity: mocks.synchronizeFirebaseIdentity,
}));

import { getAuthenticatedSession } from "@/lib/auth/session";

describe("marketplace session identity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.headers.mockResolvedValue(
      new Headers({ "x-marketplace-user-id": "user-b" }),
    );
    mocks.cookies.mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    });
  });

  it("does not authenticate a forged marketplace identity header without a session", async () => {
    mocks.cookies.mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    });

    await expect(getAuthenticatedSession()).resolves.toBeNull();
  });

  it("uses the verified session identity instead of a forged marketplace identity header", async () => {
    mocks.cookies.mockResolvedValue({
      get: vi.fn((name: string) =>
        name === "session" ? { value: "valid-session" } : undefined,
      ),
    });
    mocks.verifyToken.mockResolvedValue({
      userId: "user-a",
      email: "a@example.com",
      platformRole: "CUSTOMER",
      vendorRole: null,
      vendorId: null,
    });

    await expect(getAuthenticatedSession()).resolves.toMatchObject({
      userId: "user-a",
    });
  });

  it("verifies a native Firebase Bearer token and resolves its marketplace identity", async () => {
    mocks.headers.mockResolvedValue(
      new Headers({ authorization: "Bearer firebase-id-token" }),
    );
    mocks.verifyToken.mockResolvedValue(null);
    mocks.verifyIdToken.mockResolvedValue({
      uid: "firebase-uid",
      email: "buyer@example.test",
      name: "Buyer",
      email_verified: true,
    });
    mocks.synchronizeFirebaseIdentity.mockResolvedValue({
      id: "marketplace-user",
      email: "buyer@example.test",
      vendorId: null,
      vendorRole: null,
      platformRole: "CUSTOMER",
    });

    await expect(getAuthenticatedSession()).resolves.toEqual({
      userId: "marketplace-user",
      email: "buyer@example.test",
      vendorId: null,
      vendorRole: null,
      platformRole: "CUSTOMER",
    });
    expect(mocks.verifyIdToken).toHaveBeenCalledWith("firebase-id-token");
    expect(mocks.synchronizeFirebaseIdentity).toHaveBeenCalledWith(
      expect.objectContaining({ uid: "firebase-uid" }),
    );
  });

  it("fails closed when Firebase rejects a native Bearer token", async () => {
    mocks.headers.mockResolvedValue(
      new Headers({ authorization: "Bearer forged-token" }),
    );
    mocks.verifyToken.mockResolvedValue(null);
    mocks.verifyIdToken.mockRejectedValue(new Error("invalid token"));

    await expect(getAuthenticatedSession()).resolves.toBeNull();
    expect(mocks.synchronizeFirebaseIdentity).not.toHaveBeenCalled();
  });
});
