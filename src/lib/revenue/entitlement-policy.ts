export const REVENUE_POLICY_VERSION = "MEZORA_REVENUE_V2" as const;
export const INTRODUCTORY_TRIAL_DAYS = 30;
export const SUBSCRIPTION_GRACE_DAYS = 7;
export const LEGACY_TRANSITION_DAYS = 30;

export const VENDOR_CAPABILITIES = ["BASIC_ANALYTICS", "ADVANCED_ANALYTICS", "PREMIUM_INSIGHTS", "STANDARD_INVENTORY", "ADVANCED_INVENTORY", "CSV_EXPORTS", "PRODUCT_MANAGEMENT", "BRANCH_MANAGEMENT", "TEAM_MANAGEMENT", "ADVERTISING_ACCESS"] as const;
export type VendorCapability = (typeof VENDOR_CAPABILITIES)[number];
export type PaidPlanCode = "STARTER" | "GROWTH" | "PREMIUM" | "ENTERPRISE";
export type PaidBillingInterval = "MONTHLY" | "YEARLY";
export type PlanPolicyDefinition = { code: PaidPlanCode; version: number; monthlyPriceUgx: number; yearlyPriceUgx: number; activeProductLimit: number | null; productSafetyCeiling: number | null; branchLimit: number; staffLimit: number; capabilities: readonly VendorCapability[] };

const common = ["BASIC_ANALYTICS", "STANDARD_INVENTORY", "PRODUCT_MANAGEMENT", "BRANCH_MANAGEMENT", "TEAM_MANAGEMENT", "ADVERTISING_ACCESS"] as const satisfies readonly VendorCapability[];
export const APPROVED_PLAN_DEFINITIONS: Readonly<Record<PaidPlanCode, PlanPolicyDefinition>> = Object.freeze({
  STARTER: Object.freeze({ code: "STARTER", version: 2, monthlyPriceUgx: 25_000, yearlyPriceUgx: 280_000, activeProductLimit: 100, productSafetyCeiling: null, branchLimit: 1, staffLimit: 2, capabilities: Object.freeze([...common] satisfies VendorCapability[]) }),
  GROWTH: Object.freeze({ code: "GROWTH", version: 2, monthlyPriceUgx: 60_000, yearlyPriceUgx: 700_000, activeProductLimit: 1_000, productSafetyCeiling: null, branchLimit: 5, staffLimit: 5, capabilities: Object.freeze([...common, "ADVANCED_ANALYTICS", "CSV_EXPORTS"] satisfies VendorCapability[]) }),
  PREMIUM: Object.freeze({ code: "PREMIUM", version: 2, monthlyPriceUgx: 120_000, yearlyPriceUgx: 1_400_000, activeProductLimit: null, productSafetyCeiling: 10_000, branchLimit: 20, staffLimit: 10, capabilities: Object.freeze([...common, "ADVANCED_ANALYTICS", "PREMIUM_INSIGHTS", "ADVANCED_INVENTORY", "CSV_EXPORTS"] satisfies VendorCapability[]) }),
  ENTERPRISE: Object.freeze({ code: "ENTERPRISE", version: 1, monthlyPriceUgx: 500_000, yearlyPriceUgx: 5_000_000, activeProductLimit: null, productSafetyCeiling: 10_000, branchLimit: 20, staffLimit: 25, capabilities: Object.freeze([...common, "ADVANCED_ANALYTICS", "PREMIUM_INSIGHTS", "ADVANCED_INVENTORY", "CSV_EXPORTS"] satisfies VendorCapability[]) }),
});

export const TRIAL_POLICY = Object.freeze({ policyVersion: REVENUE_POLICY_VERSION, durationDays: INTRODUCTORY_TRIAL_DAYS, activeProductLimit: 25, productSafetyCeiling: null, branchLimit: 1, staffLimit: 1, capabilities: Object.freeze(["BASIC_ANALYTICS", "ADVANCED_ANALYTICS", "STANDARD_INVENTORY", "PRODUCT_MANAGEMENT", "BRANCH_MANAGEMENT"] as const satisfies readonly VendorCapability[]) });

/** Historical BUSINESS records retain their code but receive Growth-equivalent metadata. */
export function compatiblePaidPlanCode(code: string): PaidPlanCode | null { if (code === "BUSINESS") return "GROWTH"; return code === "STARTER" || code === "GROWTH" || code === "PREMIUM" || code === "ENTERPRISE" ? code : null; }
export function planPriceUgx(plan: PlanPolicyDefinition, interval: PaidBillingInterval) { return interval === "YEARLY" ? plan.yearlyPriceUgx : plan.monthlyPriceUgx; }
export function capabilityMap(enabled: readonly string[]) { const set = new Set(enabled); return Object.fromEntries(VENDOR_CAPABILITIES.map((capability) => [capability, set.has(capability)])) as Record<VendorCapability, boolean>; }
