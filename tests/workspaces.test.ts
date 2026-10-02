import { PlatformRole, UserStatus, VendorStatus, VendorUserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { getWorkspaceAccess } from "@/lib/auth/workspaces";

const userId = "user-1";
const activeVendor = { id: "vendor-1", ownerId: userId, status: VendorStatus.ACTIVE };

function user(overrides: Partial<Parameters<typeof getWorkspaceAccess>[1]> = {}) {
  return {
    status: UserStatus.ACTIVE,
    platformRole: PlatformRole.CUSTOMER,
    vendorId: null,
    vendorRole: null,
    vendorProfile: null,
    ownedVendor: null,
    ...overrides,
  };
}

describe("workspace access projection", () => {
  it("hides all workspaces for a customer-only user", () => {
    expect(getWorkspaceAccess(userId, user())).toEqual({ canAccessVendor: false, canAccessAdmin: false });
  });

  it("shows the vendor workspace only for an active vendor member", () => {
    expect(getWorkspaceAccess(userId, user({
      platformRole: PlatformRole.VENDOR,
      vendorId: activeVendor.id,
      vendorRole: VendorUserRole.OWNER,
      vendorProfile: activeVendor,
    }))).toEqual({ canAccessVendor: true, canAccessAdmin: false });
  });

  it.each([PlatformRole.ADMIN, PlatformRole.SUPER_ADMIN])("shows the admin workspace for %s", (platformRole) => {
    expect(getWorkspaceAccess(userId, user({ platformRole }))).toEqual({ canAccessVendor: false, canAccessAdmin: true });
  });

  it("hides workspaces for inactive accounts", () => {
    expect(getWorkspaceAccess(userId, user({ status: UserStatus.SUSPENDED, platformRole: PlatformRole.ADMIN }))).toEqual({ canAccessVendor: false, canAccessAdmin: false });
  });
});
