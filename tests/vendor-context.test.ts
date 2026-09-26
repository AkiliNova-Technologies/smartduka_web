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
  requireVendorContext,
  VendorAuthorizationError,
} from "@/lib/auth/vendor-context";

const vendorA = {
  id: "vendor-a",
  ownerId: "owner-a",
  slug: "vendor-a",
  status: "ACTIVE",
};

describe("authoritative vendor context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUserId.mockResolvedValue("user-a");
  });

  it("derives Vendor A from the current database membership", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "user-a",
      status: "ACTIVE",
      vendorId: "vendor-a",
      vendorRole: "OWNER",
      vendorProfile: vendorA,
      ownedVendor: null,
    });

    await expect(
      requireVendorContext("vendor:manage_products"),
    ).resolves.toMatchObject({
      vendorId: "vendor-a",
      user: { id: "user-a" },
      vendorRole: "OWNER",
    });
    expect(mocks.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-a" } }),
    );
  });

  it("rejects customers and suspended vendors", async () => {
    mocks.findUnique.mockResolvedValueOnce({
      id: "customer",
      status: "ACTIVE",
      vendorId: null,
      vendorRole: null,
      vendorProfile: null,
      ownedVendor: null,
    });
    await expect(requireVendorContext()).rejects.toBeInstanceOf(
      VendorAuthorizationError,
    );

    mocks.findUnique.mockResolvedValueOnce({
      id: "user-a",
      status: "ACTIVE",
      vendorId: "vendor-a",
      vendorRole: "OWNER",
      vendorProfile: { ...vendorA, status: "SUSPENDED" },
      ownedVendor: null,
    });
    await expect(requireVendorContext()).rejects.toBeInstanceOf(
      VendorAuthorizationError,
    );
  });

  it("enforces the current vendor role, not a caller claim", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "user-a",
      status: "ACTIVE",
      vendorId: "vendor-a",
      vendorRole: "STAFF",
      vendorProfile: vendorA,
      ownedVendor: null,
    });
    await expect(
      requireVendorContext("vendor:manage_products"),
    ).rejects.toBeInstanceOf(VendorAuthorizationError);
  });
});
