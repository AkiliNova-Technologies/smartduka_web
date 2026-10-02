import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ admin: vi.fn(), transaction: vi.fn(), product: vi.fn(), vendor: vi.fn() }));
vi.mock("@/lib/auth/admin-context", () => ({ requireAdminContext: mocks.admin }));
vi.mock("@/lib/prisma/client", () => ({ prisma: { $transaction: mocks.transaction, product: { findFirst: mocks.product }, vendorProfile: { findFirst: mocks.vendor } } }));

import { FEATURED_PRIORITY_STEP, MarketingService } from "@/services/marketing";

type Row = { id: string; priority: number; productId?: string; vendorId?: string; createdAt: Date };
let products: Row[];
let shops: Row[];
let failId: string | null;

function table(rows: () => Row[]) {
  return {
    findMany: vi.fn(async (args: { select?: { id: true } }) => args.select ? rows().map(({ id }) => ({ id })) : [...rows()].sort((a, b) => a.priority - b.priority || a.createdAt.valueOf() - b.createdAt.valueOf() || a.id.localeCompare(b.id))),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: { priority: number } }) => { if (where.id === failId) throw new Error("forced update failure"); const row = rows().find((item) => item.id === where.id); if (!row) throw new Error("missing"); row.priority = data.priority; return row; }),
    findUnique: vi.fn(async ({ where }: { where: { productId?: string; vendorId?: string } }) => where.productId ? rows().find((row) => row.productId === where.productId) ?? null : rows().find((row) => row.vendorId === where.vendorId) ?? null),
    aggregate: vi.fn(async () => ({ _max: { priority: rows().reduce<number | null>((max, row) => max === null ? row.priority : Math.max(max, row.priority), null) } })),
    create: vi.fn(async ({ data }: { data: Row }) => { rows().push({ ...data, id: `new-${rows().length}`, createdAt: new Date() }); return rows().at(-1); }),
  };
}

beforeEach(() => {
  vi.clearAllMocks(); failId = null;
  products = ["A", "B", "C"].map((id, index) => ({ id, productId: id, priority: (index + 1) * 100, createdAt: new Date(index) }));
  shops = ["A", "B", "C"].map((id, index) => ({ id, vendorId: id, priority: (index + 1) * 100, createdAt: new Date(index) }));
  mocks.admin.mockResolvedValue({ userId: "admin-a" }); mocks.product.mockResolvedValue({ id: "D" }); mocks.vendor.mockResolvedValue({ id: "D" });
  mocks.transaction.mockImplementation(async (callback: (tx: ReturnType<typeof transactionClient>) => Promise<unknown>) => {
    const productSnapshot = structuredClone(products), shopSnapshot = structuredClone(shops);
    try { return await callback(transactionClient()); } catch (error) { products = productSnapshot; shops = shopSnapshot; throw error; }
  });
});
function transactionClient() { return { featuredProduct: table(() => products), featuredShop: table(() => shops) }; }

describe("transactional featured ranking", () => {
  it("canonicalizes product and shop ordering in serializable transactions", async () => {
    await MarketingService.reorderFeaturedProducts(["C", "A", "B"]);
    await MarketingService.reorderFeaturedShops(["C", "A", "B"]);
    expect(products.map((row) => [row.id, row.priority])).toEqual([["A", 200], ["B", 300], ["C", 100]]);
    expect(shops.map((row) => [row.id, row.priority])).toEqual([["A", 200], ["B", 300], ["C", 100]]);
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ isolationLevel: "Serializable" }));
  });

  it.each([[["unknown"], "UNKNOWN_FEATURED_ITEM"], [["A", "A", "B"], "DUPLICATE_FEATURED_ID"]] as const)("rejects invalid product order %o", async (input, code) => {
    await expect(MarketingService.reorderFeaturedProducts(input)).rejects.toMatchObject({ code });
    expect(products.map((row) => row.priority)).toEqual([100, 200, 300]);
  });

  it("rejects stale subsets without changing the newer collection", async () => {
    products.push({ id: "D", productId: "D", priority: 400, createdAt: new Date(4) });
    await expect(MarketingService.reorderFeaturedProducts(["A", "C", "B"])).rejects.toMatchObject({ code: "FEATURED_ORDER_CONFLICT" });
    expect(products.map((row) => row.priority)).toEqual([100, 200, 300, 400]);
  });

  it("rolls back an update failure", async () => {
    failId = "A";
    await expect(MarketingService.reorderFeaturedProducts(["C", "A", "B"])).rejects.toThrow("forced update failure");
    expect(products.map((row) => row.priority)).toEqual([100, 200, 300]);
  });

  it("appends newly featured products and shops at the server-calculated next priority", async () => {
    const product = await MarketingService.saveFeatured("product", "D");
    const shop = await MarketingService.saveFeatured("shop", "D");
    expect(product).toMatchObject({ priority: 400 });
    expect(shop).toMatchObject({ priority: 400 });
    expect(FEATURED_PRIORITY_STEP).toBe(100);
  });

  it("starts an empty collection at the canonical first priority", async () => {
    products = [];
    await expect(MarketingService.saveFeatured("product", "D")).resolves.toMatchObject({ priority: 100 });
  });

  it("requires server-side platform authority", async () => {
    mocks.admin.mockRejectedValue(new Error("Denied"));
    await expect(MarketingService.reorderFeaturedProducts(["A", "B", "C"])).rejects.toThrow("Denied");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
