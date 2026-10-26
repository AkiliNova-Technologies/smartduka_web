import { describe, expect, it } from "vitest";
import { APPROVED_PLAN_DEFINITIONS, INTRODUCTORY_TRIAL_DAYS, LEGACY_TRANSITION_DAYS, REVENUE_POLICY_VERSION, SUBSCRIPTION_GRACE_DAYS, TRIAL_POLICY, capabilityMap, compatiblePaidPlanCode } from "@/lib/revenue/entitlement-policy";

describe("MWEZORA_REVENUE_V1 policy", () => {
  it("defines the three approved immutable commercial configurations", () => {
    expect(REVENUE_POLICY_VERSION).toBe("MWEZORA_REVENUE_V1");
    expect(Object.keys(APPROVED_PLAN_DEFINITIONS)).toEqual(["STARTER", "GROWTH", "PREMIUM"]);
    expect(Object.values(APPROVED_PLAN_DEFINITIONS).map((plan) => plan.monthlyPriceUgx)).toEqual([25_000, 60_000, 120_000]);
    expect(Object.values(APPROVED_PLAN_DEFINITIONS).map((plan) => [plan.activeProductLimit, plan.branchLimit, plan.staffLimit])).toEqual([[100, 1, 2], [1_000, 5, 10], [null, 20, 30]]);
  });
  it("uses the approved trial, grace and legacy transition durations", () => { expect([INTRODUCTORY_TRIAL_DAYS, SUBSCRIPTION_GRACE_DAYS, LEGACY_TRANSITION_DAYS]).toEqual([14, 7, 30]); expect(TRIAL_POLICY.staffLimit).toBe(0); expect(TRIAL_POLICY.activeProductLimit).toBe(25); });
  it("maps BUSINESS explicitly without renaming unknown records", () => { expect(compatiblePaidPlanCode("BUSINESS")).toBe("GROWTH"); expect(compatiblePaidPlanCode("UNKNOWN")).toBeNull(); });
  it("does not interpret advertising access as credit or placement", () => { expect(APPROVED_PLAN_DEFINITIONS.STARTER.capabilities).toContain("ADVERTISING_ACCESS"); expect(JSON.stringify(APPROVED_PLAN_DEFINITIONS)).not.toMatch(/credit|placement/i); });
  it("resolves typed capability metadata", () => { const map = capabilityMap(APPROVED_PLAN_DEFINITIONS.PREMIUM.capabilities); expect(map.PREMIUM_INSIGHTS).toBe(true); expect(map.ADVANCED_INVENTORY).toBe(true); expect(capabilityMap(TRIAL_POLICY.capabilities).CSV_EXPORTS).toBe(false); });
  it("documents a finite fair-use safety ceiling for Premium", () => { expect(APPROVED_PLAN_DEFINITIONS.PREMIUM.activeProductLimit).toBeNull(); expect(APPROVED_PLAN_DEFINITIONS.PREMIUM.productSafetyCeiling).toBe(10_000); });
});
