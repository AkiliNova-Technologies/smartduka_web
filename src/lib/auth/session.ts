import { headers } from "next/headers";
import { PlatformRole, VendorUserRole } from "@prisma/client";

export interface AuthenticatedUserSession {
  userId: string;
  email: string;
  vendorId: string | null;           
  vendorRole: VendorUserRole | null; 
  platformRole: PlatformRole | null; 
}

/**
 * Fast-access server context utility. Extracts the authenticated marketplace context 
 * injected directly by the edge gateway shield OR authorizes background cron workers.
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

  const userId = requestHeaders.get("x-marketplace-user-id");
  const email = requestHeaders.get("x-marketplace-email");

  if (!userId || !email) {
    return null;
  }

  return {
    userId,
    email,
    vendorId: requestHeaders.get("x-marketplace-vendor-id"),
    vendorRole: requestHeaders.get("x-marketplace-vendor-role") as VendorUserRole | null,
    platformRole: requestHeaders.get("x-marketplace-platform-role") as PlatformRole | null,
  };
}