import { PlatformRole, VendorUserRole } from "@prisma/client";

export type AppPermissionKey =
  | "platform:manage"           // Super admin master override
  | "platform:view_analytics"   // Global metrics overview
  | "platform:manage_vendors"   // Onboarding, verification, and suspension loops
  | "platform:manage_billing"   // Monitoring mall vendor system subscriptions
  | "platform:customer_support" // Managing global order disputes and reviews
  | "vendor:manage_shop"        // Adjust profile, storefront layout, parameters
  | "vendor:manage_team"        // Alter role capabilities of store employees
  | "vendor:manage_products"    // Create, update, archive shop products
  | "vendor:view_orders"        // Track incoming items assigned to shop
  | "vendor:process_orders"     // Trigger fulfillment state changes
  | "vendor:view_ledger"        // Monitor escrow clearings, transactions
  | "vendor:request_payout";    // Execute fund transfers out to mobile money/bank

/**
 * Access Matrix for Corporate Marketplace Employees
 */
export const PLATFORM_ROLE_PERMISSIONS: Record<PlatformRole, AppPermissionKey[]> = {
  SUPER_ADMIN: ["platform:manage"],
  ADMIN: ["platform:view_analytics", "platform:manage_vendors", "platform:manage_billing", "platform:customer_support"],
  SUPPORT: ["platform:customer_support"],
  BILLING: ["platform:view_analytics", "platform:manage_billing"],
};

/**
 * Access Matrix for Multi-Tenant Vendor Teams
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<VendorUserRole, AppPermissionKey[]> = {
  OWNER: [
    "vendor:manage_shop", "vendor:manage_team", "vendor:manage_products",
    "vendor:view_orders", "vendor:process_orders", "vendor:view_ledger", "vendor:request_payout"
  ],
  ADMIN: [
    "vendor:manage_shop", "vendor:manage_team", "vendor:manage_products",
    "vendor:view_orders", "vendor:process_orders", "vendor:view_ledger"
  ],
  MANAGER: [
    "vendor:manage_products", "vendor:view_orders", "vendor:process_orders"
  ],
  STAFF: [
    "vendor:view_orders", "vendor:process_orders"
  ],
  ACCOUNTANT: [
    "vendor:view_orders", "vendor:view_ledger", "vendor:request_payout"
  ]
};

interface UserAuthorizationToken {
  vendorRole?: VendorUserRole | null;
  platformRole?: PlatformRole | null;
}

/**
 * Fast checking utility to evaluate raw role access tokens before handling mutations.
 */
export function hasPermission(auth: UserAuthorizationToken, required: AppPermissionKey): boolean {
  if (auth.platformRole && PLATFORM_ROLE_PERMISSIONS[auth.platformRole]) {
    if (PLATFORM_ROLE_PERMISSIONS[auth.platformRole].includes("platform:manage")) return true;
    if (PLATFORM_ROLE_PERMISSIONS[auth.platformRole].includes(required)) return true;
  }

  if (auth.vendorRole && DEFAULT_ROLE_PERMISSIONS[auth.vendorRole]) {
    if (DEFAULT_ROLE_PERMISSIONS[auth.vendorRole].includes(required)) return true;
  }

  return false;
}