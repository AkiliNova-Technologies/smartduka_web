import { PlatformRole, UserStatus } from "@prisma/client";
import { getCurrentUserId } from "@/lib/auth/session";
import { hasPermission, type AppPermissionKey } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma/client";

export class AdminAuthorizationError extends Error {}

export interface AuthorizedAdminContext {
  userId: string;
  platformRole: PlatformRole;
}

/** Resolves privileged authority from the verified session and current DB state. */
export async function requireAdminContext(
  permission: AppPermissionKey,
): Promise<AuthorizedAdminContext> {
  const userId = await getCurrentUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, status: true, platformRole: true },
  });

  if (!user || user.status !== UserStatus.ACTIVE) {
    throw new AdminAuthorizationError("An active administrative account is required.");
  }

  if (!user.platformRole || !hasPermission({ platformRole: user.platformRole }, permission)) {
    throw new AdminAuthorizationError("Administrative permission denied.");
  }

  return { userId: user.id, platformRole: user.platformRole };
}
