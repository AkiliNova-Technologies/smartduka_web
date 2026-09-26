import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  cookies: vi.fn(),
  verifyToken: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: mocks.headers,
  cookies: mocks.cookies,
}));
vi.mock("@/lib/auth/jwt", () => ({ verifyToken: mocks.verifyToken }));

import { getAuthenticatedSession } from "@/lib/auth/session";

describe("marketplace session identity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.headers.mockResolvedValue(
      new Headers({ "x-marketplace-user-id": "user-b" }),
    );
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
});
