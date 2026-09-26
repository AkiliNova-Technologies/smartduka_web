import { headers, cookies } from "next/headers";
import { PlatformRole, UserStatus, VendorUserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { verifyToken } from "@/lib/auth/jwt";

export class AuthenticationRequiredError extends Error {}
export class AccountInactiveError extends Error {}

export interface AuthenticatedUserSession {
  userId: string;
  email: string;
  vendorId: string | null;
  vendorRole: VendorUserRole | null;
  platformRole: PlatformRole | null;
}

/**
 * Fast-access server context utility. Browser identity is derived only from a
 * cryptographically verified marketplace session cookie. Background cron workers
 * use their separate shared-secret authentication path.
 */
export async function getAuthenticatedSession(): Promise<AuthenticatedUserSession | null> {
  const requestHeaders = await headers();

  const authHeader = requestHeaders.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return {
      userId: "MARKETPLACE_CRON_WORKER",
      email: "cron@platform.infrastructure",
      vendorId: null,
      vendorRole: "OWNER" as VendorUserRole,
      platformRole: "SUPER_ADMIN" as PlatformRole,
    };
  }

  try {
    const cookieStore = await cookies();
    const sessionCookie =
      cookieStore.get("marketplace_access_token") || cookieStore.get("session");
    if (sessionCookie) {
      const session = await verifyToken(sessionCookie.value);
      if (session) {
        return {
          userId: session.userId,
          email: session.email,
          vendorId: session.vendorId,
          vendorRole: session.vendorRole,
          platformRole: session.platformRole,
        };
      }
    }
  } catch {
    // cookies() can throw in some contexts — ignore
  }

  return null;
}

/**
 * Convenience helper — extracts just the userId from the authenticated session.
 * Throws if not authenticated (use in protected server actions/routes).
 */
export async function getCurrentUserId(): Promise<string> {
  const session = await getAuthenticatedSession();
  if (!session) {
    throw new AuthenticationRequiredError("Unauthorized: No authenticated session found.");
  }
  return session.userId;
}

/** Resolves a session identity whose current database account remains active. */
export async function requireActiveUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (userId === "MARKETPLACE_CRON_WORKER") return userId;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { status: true } });
  if (!user || user.status !== UserStatus.ACTIVE) {
    throw new AccountInactiveError("This account is no longer active.");
  }
  return userId;
}

/**
 * Convenience helper — extracts just the userId, returns null if not authenticated.
 * Use when authentication is optional (public routes with optional personalization).
 */
export async function getCurrentUserIdOrNull(): Promise<string | null> {
  const session = await getAuthenticatedSession();
  return session?.userId ?? null;
}

/**
 * Checks if the current user has a specific platform role.
 */
export async function hasPlatformRole(role: PlatformRole): Promise<boolean> {
  const userId = await requireActiveUserId();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { platformRole: true } });
  return user?.platformRole === role;
}

/**
 * Checks if the current user is a vendor and returns their vendor context.
 */
export async function getVendorContext(): Promise<{ vendorId: string; vendorRole: VendorUserRole } | null> {
  const userId = await requireActiveUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { vendorId: true, vendorRole: true, vendorProfile: { select: { id: true, status: true } } },
  });
  if (!user?.vendorId || !user.vendorRole || user.vendorProfile?.id !== user.vendorId || user.vendorProfile.status !== "ACTIVE") return null;
  return { vendorId: user.vendorId, vendorRole: user.vendorRole };
}