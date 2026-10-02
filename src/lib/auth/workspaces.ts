import { PlatformRole, UserStatus, VendorStatus, VendorUserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { getAuthenticatedSession } from "@/lib/auth/session";

export type WorkspaceAccess = {
  canAccessVendor: boolean;
  canAccessAdmin: boolean;
};

type WorkspaceUser = {
  status: UserStatus;
  platformRole: PlatformRole | null;
  vendorId: string | null;
  vendorRole: VendorUserRole | null;
  vendorProfile: { id: string; ownerId: string; status: VendorStatus } | null;
  ownedVendor: { id: string; ownerId: string; status: VendorStatus } | null;
};

export function getWorkspaceAccess(userId: string, user: WorkspaceUser): WorkspaceAccess {
  if (user.status !== UserStatus.ACTIVE) {
    return { canAccessVendor: false, canAccessAdmin: false };
  }

  const vendor = user.vendorProfile ?? user.ownedVendor;
  const vendorRole = user.vendorRole ??
    (vendor?.ownerId === userId ? VendorUserRole.OWNER : null);
  const isActiveVendorMember = Boolean(
    vendor &&
      vendorRole &&
      vendor.status === VendorStatus.ACTIVE &&
      (user.vendorId === vendor.id || vendor.ownerId === userId),
  );

  return {
    canAccessVendor:
      user.platformRole === PlatformRole.VENDOR && isActiveVendorMember,
    canAccessAdmin:
      user.platformRole === PlatformRole.ADMIN ||
      user.platformRole === PlatformRole.SUPER_ADMIN,
  };
}

export async function getCurrentWorkspaceAccess(): Promise<WorkspaceAccess> {
  const session = await getAuthenticatedSession();
  if (!session || session.userId === "MARKETPLACE_CRON_WORKER") {
    return { canAccessVendor: false, canAccessAdmin: false };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      status: true,
      platformRole: true,
      vendorId: true,
      vendorRole: true,
      vendorProfile: { select: { id: true, ownerId: true, status: true } },
      ownedVendor: { select: { id: true, ownerId: true, status: true } },
    },
  });

  return user
    ? getWorkspaceAccess(session.userId, user)
    : { canAccessVendor: false, canAccessAdmin: false };
}
