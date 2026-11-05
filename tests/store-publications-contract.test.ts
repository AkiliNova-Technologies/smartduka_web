import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hasPermission } from "@/lib/auth/permissions";

const read = (path: string) => readFileSync(path, "utf8");

describe("vendor audience publication contract", () => {
  it("uses one vendor publication aggregate and keeps paid and platform campaigns distinct", () => {
    const schema = read("prisma/schema.prisma");
    expect(schema).toContain("model StorePublication");
    expect(schema).toContain("ANNOUNCEMENT\n  FOLLOWER_CAMPAIGN");
    expect(schema).toContain("model PromotionCampaign");
    expect(schema).toContain("model MarketingNotificationCampaign");
    expect(schema).toContain("@@index([vendorId, kind, status, createdAt])");
  });

  it("grants drafting to operational managers but not ordinary staff", () => {
    expect(hasPermission({ vendorRole: "OWNER" }, "vendor:manage_audience")).toBe(true);
    expect(hasPermission({ vendorRole: "ADMIN" }, "vendor:manage_audience")).toBe(true);
    expect(hasPermission({ vendorRole: "MANAGER" }, "vendor:manage_audience")).toBe(true);
    expect(hasPermission({ vendorRole: "STAFF" }, "vendor:manage_audience")).toBe(false);
  });

  it("enforces owner/admin publication review, ownership, entitlements, and product eligibility", () => {
    const service = read("src/services/store-publications.ts");
    expect(service).toContain("context.vendorRole !== VendorUserRole.OWNER");
    expect(service).toContain("status: StorePublicationStatus.IN_REVIEW");
    expect(service).toContain("vendorId: context.vendorId");
    expect(service).toContain("capabilities.ADVERTISING_ACCESS");
    expect(service).toContain("Choose only active products owned by this shop.");
  });

  it("creates one idempotent non-delivering publication event", () => {
    const schema = read("prisma/schema.prisma"), service = read("src/services/store-publications.ts");
    expect(schema).toContain("publicationId        String           @unique");
    expect(schema).toContain("eventKey             String           @unique");
    expect(service).toContain("storePublicationEvent.upsert");
    expect(service).toContain("notificationEligible: true");
    expect(service).toContain("deliveryEnabled: false");
    expect(service).toContain("followingAloneIsInsufficient: true");
    expect(service).not.toContain("NotificationService.create");
    expect(service).not.toContain("pushDeliveryOutbox.create");
  });

  it("filters the customer feed to followed vendors and current published content", () => {
    const service = read("src/services/store-following.ts");
    expect(service).toContain("followers: { some: { customerId } }");
    expect(service).toContain("status: StorePublicationStatus.PUBLISHED");
    expect(service).toContain("expiresAt: { gt: now }");
    expect(service).toContain("publishedAt: { lte: now }");
    expect(service).toContain("b.publishedAt.localeCompare(a.publishedAt) || b.id.localeCompare(a.id)");
  });

  it("rate limits publication mutations and exposes no follower identities", () => {
    const route = read("src/app/api/v1/vendor/publications/route.ts"), metrics = read("src/services/store-publications.ts");
    expect(route).toContain("checkRateLimit");
    expect(route).toContain("private, no-store");
    expect(metrics).toContain("storeFollow.count");
    expect(metrics).not.toContain("customer: {");
    expect(metrics).not.toContain("customerId: true");
  });
});
