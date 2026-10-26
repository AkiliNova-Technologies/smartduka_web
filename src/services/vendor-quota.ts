import { Prisma } from "@prisma/client";
import { VendorEntitlementService, type VendorResourceLimits, type VendorResourceUsage } from "@/services/vendor-entitlement";

export type VendorQuotaResource = keyof Pick<VendorResourceUsage, "ACTIVE_PRODUCTS" | "SHOP_BRANCHES" | "STAFF_ACCOUNTS">;

export class VendorPlanLimitError extends Error {
  readonly code = "VENDOR_PLAN_LIMIT_REACHED";
  constructor(public readonly details: { resource: VendorQuotaResource; currentUsage: number; limit: number; requestedUnits: number; upgradeRequired: true }) {
    const resource = details.resource.toLowerCase().replaceAll("_", " ");
    super(`You've reached your plan limit of ${details.limit} ${resource}. Current usage: ${details.currentUsage} of ${details.limit}. Upgrade for additional capacity.`);
    this.name = "VendorPlanLimitError";
  }
}

export function vendorQuotaEnforcementEnabled() {
  return process.env.VENDOR_QUOTA_ENFORCEMENT_ENABLED?.trim().toLowerCase() === "true";
}

function effectiveLimit(limits: VendorResourceLimits, resource: VendorQuotaResource) {
  if (resource === "ACTIVE_PRODUCTS") return limits.ACTIVE_PRODUCTS ?? limits.ACTIVE_PRODUCTS_SAFETY_CEILING;
  return limits[resource];
}

export class VendorQuotaService {
  static async assertCanConsumeResource(input: { shopId: string; resource: VendorQuotaResource; additionalUnits?: number; transaction: Prisma.TransactionClient }) {
    const requestedUnits = input.additionalUnits ?? 1;
    if (!Number.isInteger(requestedUnits) || requestedUnits < 0) throw new TypeError("additionalUnits must be a non-negative integer.");
    if (!vendorQuotaEnforcementEnabled() || requestedUnits === 0) return { enforced: false as const };

    // One vendor-scoped transaction lock serializes all quota-consuming writes.
    await input.transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`vendor-quota:${input.shopId}`})) IS NULL AS acquired`;
    const entitlement = await VendorEntitlementService.getForShop(input.shopId, new Date(), input.transaction);

    // R2B cannot establish the notification-based transition date, so legacy
    // subscriptions remain unrestricted until a later phase records it.
    if (entitlement.state === "LEGACY_TRANSITION") return { enforced: false as const, entitlement };

    const limit = effectiveLimit(entitlement.limits, input.resource);
    const currentUsage = entitlement.usage[input.resource];
    if (limit !== null && currentUsage + requestedUnits > limit) {
      throw new VendorPlanLimitError({ resource: input.resource, currentUsage, limit, requestedUnits, upgradeRequired: true });
    }
    return { enforced: true as const, entitlement, currentUsage, limit };
  }
}
