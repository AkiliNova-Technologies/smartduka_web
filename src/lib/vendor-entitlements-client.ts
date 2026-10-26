export type EntitlementResource = "ACTIVE_PRODUCTS" | "SHOP_BRANCHES" | "STAFF_ACCOUNTS";
export type CapabilityMode = "FULL" | "PREVIEW";
export type VendorEntitlementSnapshotDto = {
  policyVersion: string;
  shopId: string;
  state: "TRIAL_ACTIVE" | "TRIAL_EXPIRED" | "SUBSCRIPTION_ACTIVE" | "SUBSCRIPTION_GRACE" | "SUBSCRIPTION_EXPIRED" | "CANCELLED_BUT_ACTIVE" | "LEGACY_TRANSITION" | "NO_ENTITLEMENT";
  source: "TRIAL" | "SUBSCRIPTION" | "LEGACY_SUBSCRIPTION" | "NONE";
  subscriptionStatus: string | null;
  trialStatus: string | null;
  plan: { code: "STARTER" | "GROWTH" | "PREMIUM"; historicalCode: string; version: number | null; legacy: boolean } | null;
  limits: Record<EntitlementResource, number | null> & { ACTIVE_PRODUCTS_SAFETY_CEILING: number | null };
  usage: Record<EntitlementResource, number>;
  capabilities: Record<string, boolean>;
  capabilityModes: Record<string, CapabilityMode | undefined>;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  graceEndsAt: string | null;
  pendingPlanChange: null;
};
export type VendorEntitlementResponse = { entitlement: VendorEntitlementSnapshotDto; daysRemaining: number; subscriptionPaymentState: "PENDING" | "NEEDS_REVIEW" | null };

export class VendorEntitlementClientError extends Error {
  constructor(message: string, readonly code?: string, readonly details?: Record<string, unknown>) { super(message); }
}

export async function loadVendorEntitlement(signal?: AbortSignal) {
  const response = await fetch("/api/v1/vendor/entitlements", { cache: "no-store", signal });
  const body = await response.json().catch(() => null) as { data?: VendorEntitlementResponse; error?: { code?: string; message?: string; details?: Record<string, unknown> } } | null;
  if (!response.ok || !body?.data) throw new VendorEntitlementClientError(body?.error?.message ?? "Unable to load subscription access.", body?.error?.code, body?.error?.details);
  return body.data;
}
