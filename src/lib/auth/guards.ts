import { AppPermissionKey, DEFAULT_ROLE_PERMISSIONS, PLATFORM_ROLE_PERMISSIONS } from "./permissions";
import { PlatformRole, VendorUserRole } from "@prisma/client";

export interface UserSecuritySession {
  id: string;
  platformRole: PlatformRole | null; 
  vendorRole: VendorUserRole | null;  
  vendorId: string | null;            
  userPermissions: { key: AppPermissionKey; allowed: boolean }[]; 
}

export interface ResourceContext {
  vendorId?: string | null; 
}

/**
 * Enforces unified multi-tenant context access permissions.
 * Rejects operations attempting to breach vendor isolation parameters.
 */
export function enforceSecurityContext(
  user: UserSecuritySession,
  permission: AppPermissionKey,
  resource?: ResourceContext
): boolean {
  
  // 1. Evaluate Core Platform Overrides
  if (user.platformRole) {
    const pPerms = PLATFORM_ROLE_PERMISSIONS[user.platformRole];
    if (pPerms?.includes("platform:manage")) return true;
    return pPerms?.includes(permission) ?? false;
  }

  // 2. Multi-Vendor Isolation Verification
  // Rejects regular customers or external accounts attempting to access store panels
  if (!user.vendorId) return false;
  
  // Cross-tenant data breach check: prevents Vendor A from modifying Vendor B's items
  if (resource?.vendorId && resource.vendorId !== user.vendorId) {
    return false; 
  }

  // 3. Evaluate Granular Explicit Runtime Overrides
  const explicitOverride = user.userPermissions.find((p) => p.key === permission);
  if (explicitOverride !== undefined) {
    return explicitOverride.allowed;
  }

  // 4. Evaluate Standard Dynamic Group Mappings
  if (!user.vendorRole) return false;
  const standardPermissions = DEFAULT_ROLE_PERMISSIONS[user.vendorRole];
  
  return standardPermissions?.includes(permission) ?? false;
}