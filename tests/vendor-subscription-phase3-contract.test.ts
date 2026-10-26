import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const file=(path:string)=>readFileSync(resolve(process.cwd(),path),"utf8");
const service=file("src/services/vendor-subscriptions.ts"), page=file("src/app/(vendor)/vendor/subscription/page.tsx"), sidebar=file("src/components/layout/VendorSidebar.tsx"), reconciliation=file("src/services/platform-payment-reconciliation.ts");
describe("vendor subscriptions phase 3",()=>{
 it("uses canonical versioned plans and server-authoritative pricing",()=>{for(const text of["STARTER","25_000","GROWTH","60_000","PREMIUM","120_000","subscriptionPlanVersion.upsert","amountDue: version.monthlyPriceUgx","creditApplied: 0"])expect(service).toContain(text)});
 it("does not silently seed plans when a vendor opens the subscription page",()=>{const read=service.slice(service.indexOf("static async read()"));expect(read).not.toContain("seedPlans()");expect(page).toContain("Subscription plans need setup");expect(page).toContain("npm run seed:subscription-plans")});
 it("uses platform revenue and activates only after trusted reconciliation",()=>{expect(service).toContain('type: "SUBSCRIPTION"');expect(reconciliation).toContain("vendorSubscription.update");expect(service).not.toContain("PromotionCreditLedger")});
 it("ships the dedicated navigation and subscription surface",()=>{expect(sidebar).toContain('href: "/vendor/subscription"');for(const text of["Free trial","Subscription required","Subscription & payment history"]){expect(page).toContain(text)}});
 it("starts the separate platform payment flow without granting access in the client",()=>{expect(page).toContain('"/api/v1/vendor/platform-payments"');expect(page).toContain("activates only after MTN confirms payment")});
});
