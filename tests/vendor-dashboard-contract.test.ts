import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/app/(vendor)/vendor/page.tsx"), "utf8");

describe("vendor dashboard", () => {
  it("uses vendor-scoped orders in the shared DataTable with compact dashboard features", () => {
    expect(source).toContain("<DataTable");
    expect(source).toContain("data={recentOrders}");
    expect(source).toContain("vendor-specific totals only");
    expect(source).toContain("pagination: false");
  });

  it("only reports sales from paid and delivered sub-orders", () => {
    expect(source).toContain('order.paymentStatus === "COMPLETED" && order.status === "DELIVERED"');
    expect(source).toContain("Delivered sales");
    expect(source).toContain("buildSalesChart(deliveredSales, chartNow)");
  });

  it("uses active variant inventory before parent-product inventory", () => {
    expect(source).toContain("variant.isActive !== false");
    expect(source).toContain("variant.inventoryCount");
    expect(source).toContain("No delivered sales yet");
  });
});
