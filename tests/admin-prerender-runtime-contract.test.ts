import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("admin request-time prerender boundaries", () => {
  const capacityPage = source("src/app/(admin)/admin/marketing/capacity/page.tsx");
  const inventory = source("src/services/promotion-inventory.ts");
  const jwt = source("src/lib/auth/jwt.ts");
  const route = source("src/app/api/admin/marketing/capacity/route.ts");

  it("enters request time before authenticated capacity data is resolved", () => {
    expect(capacityPage).toContain('import { connection } from "next/server"');
    expect(capacityPage).toContain("<Suspense fallback={<CapacitySkeleton />}>");
    expect(capacityPage.indexOf("await connection();")).toBeLessThan(
      capacityPage.indexOf("PromotionInventoryService.adminState()"),
    );
  });

  it("keeps authenticated content inside the page-owned Suspense boundary", () => {
    expect(capacityPage.indexOf("<Suspense fallback={<CapacitySkeleton />}>"))
      .toBeLessThan(capacityPage.indexOf("<PromotionCapacityContent />"));
    expect(capacityPage).not.toContain("instant = false");
    expect(capacityPage).not.toContain('"use cache"');
  });

  it("retains server authorization before time-sensitive inventory queries", () => {
    const adminState = inventory.slice(inventory.indexOf("static async adminState()"));
    expect(adminState.indexOf('requireAdminContext("platform:manage_billing")'))
      .toBeLessThan(adminState.indexOf("new Date()"));
    expect(inventory).toContain('status:"CONFIRMED",endAt:{gt:now}');
    expect(inventory).toContain("Prisma.TransactionIsolationLevel.Serializable");
  });

  it("preserves JWT signature and expiry enforcement", () => {
    expect(jwt).toContain("await jwtVerify(token, secret)");
    expect(jwt).toContain(".setExpirationTime");
    expect(jwt).not.toContain("clockTolerance: Infinity");
    expect(jwt).not.toContain("ignoreExpiration");
  });

  it("does not publicly cache the authenticated capacity API", () => {
    expect(route).toContain('"Cache-Control":"private, no-store"');
    expect(route).toContain("PromotionInventoryService.adminState()");
  });
});
