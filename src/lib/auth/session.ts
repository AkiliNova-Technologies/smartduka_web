import { headers, cookies } from "next/headers";
import { PlatformRole, VendorUserRole } from "@prisma/client";
import { verifyToken } from "@/lib/auth/jwt";

export interface AuthenticatedUserSession {
  userId: string;
  email: string;
  vendorId: string | null;
  vendorRole: VendorUserRole | null;
  platformRole: PlatformRole | null;
}

/**
 * Fast-access server context utility. Extracts the authenticated marketplace context
 * injected directly by the edge gateway shield, reads the session cookie for server actions,
 * OR authorizes background cron workers.
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

  // Primary: proxy-injected headers
  const userId = requestHeaders.get("x-marketplace-user-id");
  const email = requestHeaders.get("x-marketplace-email");

  if (userId && email) {
    return {
      userId,
      email,
      vendorId: requestHeaders.get("x-marketplace-vendor-id"),
      vendorRole: requestHeaders.get("x-marketplace-vendor-role") as VendorUserRole | null,
      platformRole: requestHeaders.get("x-marketplace-platform-role") as PlatformRole | null,
    };
  }

  // Fallback for server actions: read session cookie directly
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");
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
    throw new Error("Unauthorized: No authenticated session found.");
  }
  return session.userId;
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
  const session = await getAuthenticatedSession();
  return session?.platformRole === role;
}

/**
 * Checks if the current user is a vendor and returns their vendor context.
 */
export async function getVendorContext(): Promise<{
  vendorId: string;
  vendorRole: VendorUserRole;
} | null> {
  const session = await getAuthenticatedSession();
  if (!session?.vendorId) return null;
  return {
    vendorId: session.vendorId,
    vendorRole: session.vendorRole ?? ("STAFF" as VendorUserRole),
  };
}