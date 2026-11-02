import { describe, expect, it } from "vitest";
import { APPROVED_PLAN_DEFINITIONS, INTRODUCTORY_TRIAL_DAYS, LEGACY_TRANSITION_DAYS, REVENUE_POLICY_VERSION, SUBSCRIPTION_GRACE_DAYS, TRIAL_POLICY, capabilityMap, compatiblePaidPlanCode } from "@/lib/revenue/entitlement-policy";

describe("MEZORA_REVENUE_V2 policy", () => {
  it("defines the four approved immutable commercial configurations", () => {
    expect(REVENUE_POLICY_VERSION).toBe("MEZORA_REVENUE_V2");
    expect(Object.keys(APPROVED_PLAN_DEFINITIONS)).toEqual(["STARTER", "GROWTH", "PREMIUM", "ENTERPRISE"]);
    expect(Object.values(APPROVED_PLAN_DEFINITIONS).map((plan) => [plan.monthlyPriceUgx, plan.yearlyPriceUgx])).toEqual([[25_000, 280_000], [60_000, 700_000], [120_000, 1_400_000], [500_000, 5_000_000]]);
    expect(Object.values(APPROVED_PLAN_DEFINITIONS).map((plan) => [plan.activeProductLimit, plan.branchLimit, plan.staffLimit])).toEqual([[100, 1, 2], [1_000, 5, 5], [null, 20, 10], [null, 20, 25]]);
  });
  it("uses the approved trial, grace and legacy transition durations", () => { expect([INTRODUCTORY_TRIAL_DAYS, SUBSCRIPTION_GRACE_DAYS, LEGACY_TRANSITION_DAYS]).toEqual([30, 7, 30]); expect(TRIAL_POLICY.staffLimit).toBe(1); expect(TRIAL_POLICY.activeProductLimit).toBe(25); });
  it("maps BUSINESS explicitly without renaming unknown records", () => { expect(compatiblePaidPlanCode("BUSINESS")).toBe("GROWTH"); expect(compatiblePaidPlanCode("UNKNOWN")).toBeNull(); });
  it("does not interpret advertising access as credit or placement", () => { expect(APPROVED_PLAN_DEFINITIONS.STARTER.capabilities).toContain("ADVERTISING_ACCESS"); expect(JSON.stringify(APPROVED_PLAN_DEFINITIONS)).not.toMatch(/credit|placement/i); });
  it("resolves typed capability metadata", () => { const map = capabilityMap(APPROVED_PLAN_DEFINITIONS.PREMIUM.capabilities); expect(map.PREMIUM_INSIGHTS).toBe(true); expect(map.ADVANCED_INVENTORY).toBe(true); expect(capabilityMap(TRIAL_POLICY.capabilities).CSV_EXPORTS).toBe(false); });
  it("documents a finite fair-use safety ceiling for Premium", () => { expect(APPROVED_PLAN_DEFINITIONS.PREMIUM.activeProductLimit).toBeNull(); expect(APPROVED_PLAN_DEFINITIONS.PREMIUM.productSafetyCeiling).toBe(10_000); });
});
