import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("vendor orders pagination", () => {
  it("shares one generic pagination control with DataTable", () => {
    expect(source("src/components/data-table.tsx")).toContain("PaginationControls");
    const controls = source("src/components/ui/pagination-controls.tsx");
    expect(controls).toContain("onPageChange");
    expect(controls).toContain("First page");
    expect(controls).toContain("Last page");
  });

  it("keeps vendor orders paginated through vendor-scoped API parameters", () => {
    const page = source("src/app/(vendor)/vendor/orders/vendor-orders-client.tsx");
    expect(page).toContain("pageSizeOptions={[10, 20, 50]}");
    expect(page).toContain("updateQuery({ page: String(pageIndex + 1) })");
    expect(page).toContain("Search orders");
    expect(source("src/app/(vendor)/vendor/orders/page.tsx")).toContain("getVendorOrders(context.vendorId");
  });

  it("counts, filters, and stably sorts before paging under the vendor scope", () => {
    const route = source("src/services/vendor-orders.ts");
    expect(source("src/app/api/vendors/orders/route.ts")).toContain("getVendorOrders(context.vendorId");
    expect(route).toContain("vendorId");
    expect(route).toContain("prisma.subOrder.count");
    expect(route).toContain("skip: (page - 1) * pageSize");
    expect(route).toContain('orderBy: [{ createdAt: "desc" }, { id: "desc" }]');
  });
});
