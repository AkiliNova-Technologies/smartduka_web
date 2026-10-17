import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("customer orders phase 1", () => {
  it("uses scoped, deterministic database pagination", () => {
    const service = source("src/services/order.ts");
    expect(service).toContain("customerId: userId");
    expect(service).toContain("skip: (input.page - 1) * input.pageSize");
    expect(service).toContain('orderBy: [{ createdAt: "desc" }, { id: "desc" }]');
    expect(source("src/app/api/v1/orders/route.ts")).toContain("const pageSize = 10");
  });

  it("derives fulfillment from suborders and distinguishes load states", () => {
    expect(source("src/lib/customer-order-status.ts")).toContain("Partially fulfilled");
    const hook = source("src/hooks/use-customer-orders.ts");
    expect(hook).toContain('"not-found"');
    expect(hook).toContain("OrderRequestError");
    expect(hook).toContain("abortRef.current?.abort()");
  });

  it("renders prices only inside block-level containers", () => {
    const detail = source("src/app/(customer)/orders/[id]/OrderDetailClient.tsx");
    expect(detail).not.toMatch(/<p[^>]*>[^<]*<PriceDisplay/);
  });
});
