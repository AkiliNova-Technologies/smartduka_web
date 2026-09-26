import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUserId: vi.fn(),
  findUnique: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({
  getCurrentUserId: mocks.getCurrentUserId,
}));
vi.mock("@/lib/prisma/client", () => ({
  prisma: { user: { findUnique: mocks.findUnique } },
}));

import {
  AdminAuthorizationError,
  requireAdminContext,
} from "@/lib/auth/admin-context";

const current = (platformRole: string | null, status = "ACTIVE") => ({
  id: "actor",
  platformRole,
  status,
});

describe("authoritative admin context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUserId.mockResolvedValue("actor");
  });

  it("uses the current active database role for an ADMIN vendor-management permission", async () => {
    mocks.findUnique.mockResolvedValue(current("ADMIN"));
    await expect(
      requireAdminContext("platform:manage_vendors"),
    ).resolves.toEqual({ userId: "actor", platformRole: "ADMIN" });
  });

  it("rejects customer and vendor accounts even if they know an administrator ID", async () => {
    mocks.findUnique.mockResolvedValueOnce(current("CUSTOMER"));
    await expect(
      requireAdminContext("platform:manage_vendors"),
    ).rejects.toBeInstanceOf(AdminAuthorizationError);
    mocks.findUnique.mockResolvedValueOnce(current("VENDOR"));
    await expect(
      requireAdminContext("platform:manage_vendors"),
    ).rejects.toBeInstanceOf(AdminAuthorizationError);
  });

  it("revokes stale JWT admin authority and suspended admin authority from current DB state", async () => {
    mocks.findUnique.mockResolvedValueOnce(current("CUSTOMER"));
    await expect(
      requireAdminContext("platform:view_analytics"),
    ).rejects.toBeInstanceOf(AdminAuthorizationError);
    mocks.findUnique.mockResolvedValueOnce(current("ADMIN", "SUSPENDED"));
    await expect(
      requireAdminContext("platform:manage_vendors"),
    ).rejects.toBeInstanceOf(AdminAuthorizationError);
  });

  it("preserves existing BILLING and SUPER_ADMIN permission distinctions", async () => {
    mocks.findUnique.mockResolvedValueOnce(current("BILLING"));
    await expect(
      requireAdminContext("platform:manage_billing"),
    ).resolves.toMatchObject({ platformRole: "BILLING" });
    mocks.findUnique.mockResolvedValueOnce(current("BILLING"));
    await expect(
      requireAdminContext("platform:manage_vendors"),
    ).rejects.toBeInstanceOf(AdminAuthorizationError);
    mocks.findUnique.mockResolvedValueOnce(current("SUPER_ADMIN"));
    await expect(requireAdminContext("platform:manage")).resolves.toMatchObject(
      { platformRole: "SUPER_ADMIN" },
    );
  });
});
