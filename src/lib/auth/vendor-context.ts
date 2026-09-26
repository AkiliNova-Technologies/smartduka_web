import { UserStatus, VendorStatus, VendorUserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { getCurrentUserId } from "@/lib/auth/session";
import { AppPermissionKey, hasPermission } from "@/lib/auth/permissions";

export class VendorAuthorizationError extends Error {}

export interface AuthorizedVendorContext {
  user: {
    id: string;
    vendorRole: VendorUserRole;
  };
  vendor: {
    id: string;
    ownerId: string;
    slug: string;
    status: VendorStatus;
  };
  vendorId: string;
  vendorRole: VendorUserRole;
}

/**
 * Resolves the active vendor tenant from the verified browser session and current
 * database membership. Request payloads and JWT vendor claims are not authoritative.
 */
export async function requireVendorContext(
  permission?: AppPermissionKey,
): Promise<AuthorizedVendorContext> {
  const userId = await getCurrentUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      status: true,
      vendorId: true,
      vendorRole: true,
      vendorProfile: {
        select: { id: true, ownerId: true, slug: true, status: true },
      },
      ownedVendor: {
        select: { id: true, ownerId: true, slug: true, status: true },
      },
    },
  });

  if (!user || user.status !== UserStatus.ACTIVE) {
    throw new VendorAuthorizationError("An active vendor account is required.");
  }

  const vendor = user.vendorProfile || user.ownedVendor;
  const vendorRole = user.vendorRole ||
    (vendor?.ownerId === user.id ? VendorUserRole.OWNER : null);
  const isMember = Boolean(
    vendor && (user.vendorId === vendor.id || vendor.ownerId === user.id),
  );

  if (!vendor || !isMember || !vendorRole || vendor.status !== VendorStatus.ACTIVE) {
    throw new VendorAuthorizationError("An active vendor membership is required.");
  }

  if (permission && !hasPermission({ vendorRole }, permission)) {
    throw new VendorAuthorizationError("Vendor permission denied.");
  }

  return {
    user: { id: user.id, vendorRole },
    vendor,
    vendorId: vendor.id,
    vendorRole,
  };
}
