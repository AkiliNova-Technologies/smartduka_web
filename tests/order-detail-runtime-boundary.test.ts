import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("order detail runtime boundary", () => {
  it("resolves the route param in a suspense-wrapped server child", () => {
    const page = source("src/app/(customer)/orders/[id]/page.tsx");
    expect(page).toContain("<Suspense fallback={<OrderDetailFallback />}>");
    expect(page).toContain("async function OrderDetailRuntime");
    expect(page).toContain("const { id } = await params");
    expect(page).not.toContain("use(params)");
  });

  it("keeps private order state in the client component using a plain order ID", () => {
    const client = source("src/app/(customer)/orders/[id]/OrderDetailClient.tsx");
    expect(client).toContain("function OrderDetailClient({ orderId }");
    expect(client).toContain("useUserData()");
    expect(client).toContain("refreshOrders");
  });

  it("marks query and authenticated APIs as request-time before request reads", () => {
    const categories = source("src/app/api/categories/route.ts");
    const users = source("src/app/api/admin/users/route.ts");
    expect(categories).toContain("await connection();");
    expect(categories).toContain("request.nextUrl");
    expect(users).toContain("await connection();");
    expect(users).toContain("requireAdminContext");
  });
});
