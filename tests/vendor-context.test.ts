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

  it("allows managers to run day-to-day shop settings but keeps staff out", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "manager-a", status: "ACTIVE", vendorId: "vendor-a", vendorRole: "MANAGER", vendorProfile: vendorA, ownedVendor: null,
    });
    await expect(requireVendorContext("vendor:manage_shop")).resolves.toMatchObject({ vendorId: "vendor-a", vendorRole: "MANAGER" });

    mocks.findUnique.mockResolvedValue({
      id: "staff-a", status: "ACTIVE", vendorId: "vendor-a", vendorRole: "STAFF", vendorProfile: vendorA, ownedVendor: null,
    });
    await expect(requireVendorContext("vendor:manage_shop")).rejects.toBeInstanceOf(VendorAuthorizationError);
  });

  it("allows payout-capable roles but rejects manager, staff, and unrelated memberships", async () => {
    for (const role of ["OWNER", "ACCOUNTANT"] as const) {
      mocks.findUnique.mockResolvedValue({ id: `${role}-a`, status: "ACTIVE", vendorId: "vendor-a", vendorRole: role, vendorProfile: vendorA, ownedVendor: null });
      await expect(requireVendorContext("vendor:request_payout")).resolves.toMatchObject({ vendorId: "vendor-a", vendorRole: role });
    }
    for (const role of ["MANAGER", "STAFF"] as const) {
      mocks.findUnique.mockResolvedValue({ id: `${role}-a`, status: "ACTIVE", vendorId: "vendor-a", vendorRole: role, vendorProfile: vendorA, ownedVendor: null });
      await expect(requireVendorContext("vendor:request_payout")).rejects.toBeInstanceOf(VendorAuthorizationError);
    }
    mocks.findUnique.mockResolvedValue({ id: "other", status: "ACTIVE", vendorId: "vendor-b", vendorRole: "OWNER", vendorProfile: vendorA, ownedVendor: null });
    await expect(requireVendorContext("vendor:request_payout")).rejects.toBeInstanceOf(VendorAuthorizationError);
  });
});
