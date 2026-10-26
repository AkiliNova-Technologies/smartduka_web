import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { ResourceUsage } from "@/components/vendor/resource-usage";
import type { VendorEntitlementSnapshotDto } from "@/lib/vendor-entitlements-client";

const snapshot = (limit: number | null, ceiling: number | null, used: number): VendorEntitlementSnapshotDto => ({ policyVersion: "MWEZORA_REVENUE_V1", shopId: "shop-a", state: "SUBSCRIPTION_ACTIVE", source: "SUBSCRIPTION", subscriptionStatus: "ACTIVE", trialStatus: null, plan: { code: "PREMIUM", historicalCode: "PREMIUM", version: 1, legacy: false }, limits: { ACTIVE_PRODUCTS: limit, ACTIVE_PRODUCTS_SAFETY_CEILING: ceiling, SHOP_BRANCHES: 20, STAFF_ACCOUNTS: 30 }, usage: { ACTIVE_PRODUCTS: used, SHOP_BRANCHES: 1, STAFF_ACCOUNTS: 2 }, capabilities: {}, capabilityModes: {}, effectiveFrom: null, effectiveUntil: null, graceEndsAt: null, pendingPlanChange: null });

describe("vendor entitlement experience", () => {
  it("renders finite usage and accessible progress", () => { const html = renderToStaticMarkup(createElement(ResourceUsage, { resource: "ACTIVE_PRODUCTS", entitlement: snapshot(100, null, 78) })); expect(html).toContain("78 / 100"); expect(html).toContain('role="progressbar"'); expect(html).toContain('aria-valuenow="78"'); expect(html).toContain("22 remaining"); });
  it("renders Premium expanded capacity without infinite progress math", () => { const html = renderToStaticMarkup(createElement(ResourceUsage, { resource: "ACTIVE_PRODUCTS", entitlement: snapshot(null, 10_000, 712) })); expect(html).toContain("Expanded capacity"); expect(html).not.toContain("progressbar"); expect(html).not.toMatch(/Infinity|NaN/); });
  it("uses the authoritative snapshot and approved comparison copy", () => { const page = readFileSync(resolve(process.cwd(), "src/app/(vendor)/vendor/subscription/page.tsx"), "utf8"); for (const text of ["useVendorEntitlement", "14-day introductory trial", "100", "1,000", "Fair-use unlimited", "Premium insights", "Payment confirmation"]) expect(page).toContain(text); for (const forbidden of ["advertising credits", "automatic renewal", "support SLA"]) expect(page.toLowerCase()).not.toContain(forbidden); });
  it("keeps entitlement requests shop-local, uncached, and abortable", () => { const client = readFileSync(resolve(process.cwd(), "src/lib/vendor-entitlements-client.ts"), "utf8"), hook = readFileSync(resolve(process.cwd(), "src/hooks/use-vendor-entitlement.ts"), "utf8"); expect(client).toContain('cache: "no-store"'); expect(client).toContain("signal"); expect(hook).toContain("AbortController"); expect(hook).toContain("request.current"); expect(hook).not.toContain("globalThis"); });
});
