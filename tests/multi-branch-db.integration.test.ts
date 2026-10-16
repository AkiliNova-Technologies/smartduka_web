import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ actor: "" }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUserId: async () => auth.actor }));
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn(), revalidateTag: vi.fn(), updateTag: vi.fn(), revalidatePath: vi.fn() }));

import { prisma } from "@/lib/prisma/client";
import { OrderService } from "@/services/order";
import { ShopBranchService } from "@/services/shop-branches";
import { BranchInventoryService } from "@/services/branch-inventory";
import { VendorInventoryService } from "@/services/vendor-inventory";
import { getBasketBranchAvailability } from "@/services/fulfillment-options";

const enabled = process.env.RUN_FULFILLMENT_DB_TESTS === "1";
type VendorSeed = { ownerId: string; vendorId: string; productId: string };

async function reset() {
  const configuredUrl = process.env.DATABASE_URL;
  if (process.env.FULFILLMENT_TEST_DATABASE !== "isolated-local" || !configuredUrl) throw new Error("Refusing destructive setup without the isolated fulfilment-test marker.");
  const url = new URL(configuredUrl);
  if (url.hostname !== "127.0.0.1" || url.pathname !== "/mwezora_fulfillment_tests") throw new Error("Refusing destructive setup outside the local fulfilment test database.");
  await prisma.paymentProviderEvent.deleteMany(); await prisma.paymentIntent.deleteMany(); await prisma.orderItem.deleteMany(); await prisma.subOrder.deleteMany(); await prisma.order.deleteMany();
  await prisma.inventoryMovement.deleteMany(); await prisma.branchInventory.deleteMany(); await prisma.productVariant.deleteMany(); await prisma.product.deleteMany(); await prisma.auditLog.deleteMany(); await prisma.shopBranch.deleteMany(); await prisma.vendorProfile.deleteMany(); await prisma.user.deleteMany();
}
async function customer() { return (await prisma.user.create({ data: { name: "Customer", email: `${randomUUID()}@customer.test`, status: "ACTIVE" } })).id; }
async function vendor(index: number): Promise<VendorSeed> {
  const ownerId = randomUUID(), vendorId = randomUUID(), productId = randomUUID();
  await prisma.user.create({ data: { id: ownerId, name: `Vendor ${index}`, email: `${randomUUID()}@vendor.test`, status: "ACTIVE", vendorRole: "OWNER" } });
  await prisma.vendorProfile.create({ data: { id: vendorId, ownerId, storeName: `Shop ${index}`, slug: `shop-${index}-${vendorId.slice(0, 6)}`, status: "ACTIVE" } });
  await prisma.product.create({ data: { id: productId, vendorId, name: `Product ${index}`, slug: `product-${index}-${productId.slice(0, 6)}`, basePrice: index === 1 ? 130_000 : 90_000, inventoryCount: 10, status: "ACTIVE" } });
  return { ownerId, vendorId, productId };
}
const branch = (name: string, overrides: Record<string, unknown> = {}) => ({ name, slug: name.toLowerCase().replaceAll(" ", "-"), branchType: "STORE" as const, isPrimary: true, isActive: true, pickupEnabled: false, deliveryEnabled: true, addressLine: `${name} Road`, city: "Kampala", district: "Nakawa", country: "Uganda", contactPhone: "0700000000", openingHours: { monday: "08:00-18:00" }, pickupInstructions: null, deliveryAreas: ["Nakawa"], deliveryFee: 3500, deliveryEstimate: "Same day", ...overrides });

describe.runIf(enabled).sequential("multi-branch fulfilment against isolated PostgreSQL", () => {
  beforeEach(reset); afterAll(async () => { await prisma.$disconnect(); });

  it("enforces branch constraints, legacy nullability, history, authorization and concurrent primary uniqueness", async () => {
    const a = await vendor(1), b = await vendor(2), customerId = await customer(); auth.actor = a.ownerId;
    const first = await ShopBranchService.createForCurrentVendor(branch("Central"));
    await expect(ShopBranchService.createForCurrentVendor(branch("Central"))).rejects.toBeTruthy();
    await expect(ShopBranchService.updateForCurrentVendor(first.id, branch("Central Updated", { slug: "central-updated" }))).resolves.toMatchObject({ name: "Central Updated" });
    auth.actor = b.ownerId; await expect(ShopBranchService.updateForCurrentVendor(first.id, branch("Stolen"))).rejects.toMatchObject({ code: "NOT_FOUND" });
    const b1 = await ShopBranchService.createForCurrentVendor(branch("East", { isPrimary: false }));
    const b2 = await ShopBranchService.createForCurrentVendor(branch("West", { slug: "west", isPrimary: false }));
    const race = await Promise.allSettled([prisma.shopBranch.update({ where: { id: b1.id }, data: { isPrimary: true } }), prisma.shopBranch.update({ where: { id: b2.id }, data: { isPrimary: true } })]);
    expect(race.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.shopBranch.count({ where: { shopId: b.vendorId, isPrimary: true } })).toBe(1);
    const legacy = await prisma.order.create({ data: { customerId, orderNumber: `LEGACY-${randomUUID()}`, totalAmount: 1000, currency: "UGX", subTotal: 1000, totalShipping: 0, paymentGateway: "CASH_ON_DELIVERY", shippingAddress: "Legacy address", shippingPhone: "0700", shippingEmail: "" } });
    await prisma.subOrder.create({ data: { orderId: legacy.id, vendorId: a.vendorId, subOrderNumber: `LEGACY-SUB-${randomUUID()}`, vendorSubTotal: 1000, vendorShipping: 0, vendorTotal: 1000, platformCommission: 0, fulfillmentMethod: "DELIVERY" } });
    expect((await OrderService.getUserOrders(customerId))[0].subOrders[0].branchName).toBeNull();
    await prisma.subOrder.create({ data: { orderId: legacy.id, vendorId: a.vendorId, branchId: first.id, subOrderNumber: `ACTIVE-SUB-${randomUUID()}`, vendorSubTotal: 1000, vendorShipping: 0, vendorTotal: 1000, platformCommission: 0, fulfillmentMethod: "DELIVERY" } });
    auth.actor = a.ownerId; await expect(ShopBranchService.updateForCurrentVendor(first.id, branch("Central Updated", { slug: "central-updated", isActive: false }))).rejects.toMatchObject({ code: "CONFLICT" });
  }, 30_000);

  it("creates one mixed parent order with authoritative branch fees and snapshots", async () => {
    const customerId = await customer(), a = await vendor(1), b = await vendor(2);
    const delivery = await prisma.shopBranch.create({ data: { ...branch("Delivery"), shopId: a.vendorId } });
    const pickup = await prisma.shopBranch.create({ data: { ...branch("Pickup", { pickupEnabled: true, deliveryEnabled: false, deliveryFee: null, pickupInstructions: "Bring photo ID" }), shopId: b.vendorId } });
    const order = await OrderService.createOrder({ userId: customerId, checkoutRequestId: randomUUID(), items: [{ productId: a.productId, quantity: 1 }, { productId: b.productId, quantity: 1 }], shippingAddress: "Plot 1", shippingPhone: "0700000000", deliveryDistrict: "Nakawa", paymentGateway: "CASH_ON_DELIVERY", fulfillmentSelections: [{ vendorId: a.vendorId, method: "DELIVERY", branchId: delivery.id }, { vendorId: b.vendorId, method: "PICKUP", branchId: pickup.id, pickupContact: "0711111111" }] });
    const saved = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { subOrders: { orderBy: { vendorShipping: "desc" } } } });
    expect(saved.subOrders).toHaveLength(2); expect(Number(saved.totalAmount)).toBe(223_500); expect(saved.subOrders.map((sub) => Number(sub.vendorShipping))).toEqual([3500, 0]);
    expect(saved.subOrders.map((sub) => sub.branchId)).toEqual(expect.arrayContaining([delivery.id, pickup.id]));
  });

  it("associates independently selected branches when both shops support both methods", async () => {
    const customerId = await customer(), a = await vendor(1), b = await vendor(2);
    const aBranch = await prisma.shopBranch.create({ data: { ...branch("A Hybrid", { pickupEnabled: true }), shopId: a.vendorId } });
    const bBranch = await prisma.shopBranch.create({ data: { ...branch("B Hybrid", { pickupEnabled: true, deliveryFee: 5000 }), shopId: b.vendorId } });
    const order = await OrderService.createOrder({ userId: customerId, checkoutRequestId: randomUUID(), items: [{ productId: a.productId, quantity: 1 }, { productId: b.productId, quantity: 1 }], shippingAddress: "Plot 2", shippingPhone: "0700000000", deliveryDistrict: "Nakawa", paymentGateway: "CASH_ON_DELIVERY", fulfillmentSelections: [{ vendorId: a.vendorId, method: "PICKUP", branchId: aBranch.id }, { vendorId: b.vendorId, method: "DELIVERY", branchId: bBranch.id }] });
    const subs = await prisma.subOrder.findMany({ where: { orderId: order.id }, orderBy: { vendorId: "asc" } });
    expect(subs.map((sub) => [sub.branchId, sub.fulfillmentMethod])).toEqual(expect.arrayContaining([[aBranch.id, "PICKUP"], [bBranch.id, "DELIVERY"]]));
    expect(Number((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).totalShipping)).toBe(5000);
  });

  it("rolls back stock and all order writes for inactive branches and uncovered delivery", async () => {
    const customerId = await customer(), a = await vendor(1);
    const inactive = await prisma.shopBranch.create({ data: { ...branch("Inactive", { isActive: false }), shopId: a.vendorId } });
    const input = { userId: customerId, checkoutRequestId: randomUUID(), items: [{ productId: a.productId, quantity: 1 }], shippingAddress: "Plot 1", shippingPhone: "0700", deliveryDistrict: "Nakawa", paymentGateway: "CASH_ON_DELIVERY" as const, fulfillmentSelections: [{ vendorId: a.vendorId, method: "DELIVERY" as const, branchId: inactive.id }] };
    await expect(OrderService.createOrder(input)).rejects.toBeTruthy(); expect(await prisma.order.count()).toBe(0); expect((await prisma.product.findUniqueOrThrow({ where: { id: a.productId } })).inventoryCount).toBe(10);
    await prisma.shopBranch.update({ where: { id: inactive.id }, data: { isActive: true } });
    await expect(OrderService.createOrder({ ...input, checkoutRequestId: randomUUID(), deliveryDistrict: "Gulu" })).rejects.toBeTruthy(); expect(await prisma.order.count()).toBe(0); expect((await prisma.product.findUniqueOrThrow({ where: { id: a.productId } })).inventoryCount).toBe(10); expect(await prisma.paymentIntent.count()).toBe(0);
  });

  it("deduplicates concurrent checkout without duplicate stock deductions", async () => {
    const customerId = await customer(), a = await vendor(1); const location = await prisma.shopBranch.create({ data: { ...branch("Central"), shopId: a.vendorId } }); const key = randomUUID();
    const input = { userId: customerId, checkoutRequestId: key, items: [{ productId: a.productId, quantity: 1 }], shippingAddress: "Plot 1", shippingPhone: "0700", deliveryDistrict: "Nakawa", paymentGateway: "CASH_ON_DELIVERY" as const, fulfillmentSelections: [{ vendorId: a.vendorId, method: "DELIVERY" as const, branchId: location.id }] };
    const results = await Promise.allSettled([OrderService.createOrder(input), OrderService.createOrder(input)]);
    expect(results.some((result) => result.status === "fulfilled")).toBe(true); expect(await prisma.order.count()).toBe(1); expect(await prisma.subOrder.count()).toBe(1); expect((await prisma.product.findUniqueOrThrow({ where: { id: a.productId } })).inventoryCount).toBe(9); expect(await prisma.paymentIntent.count()).toBe(0);
  }, 30_000);

  it("allocates, audits, sells and prevents branch overselling atomically", async () => {
    const customerId = await customer(), a = await vendor(1); auth.actor = a.ownerId;
    const location = await prisma.shopBranch.create({ data: { ...branch("Stocked"), shopId: a.vendorId } });
    await BranchInventoryService.enable();
    await BranchInventoryService.allocate({ branchId: location.id, productId: a.productId, quantity: 2 });
    await expect(BranchInventoryService.allocate({ branchId: location.id, productId: a.productId, quantity: 9 })).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });
    const base = { userId: customerId, items: [{ productId: a.productId, quantity: 2 }], shippingAddress: "Plot", shippingPhone: "0700", deliveryDistrict: "Nakawa", paymentGateway: "CASH_ON_DELIVERY" as const, fulfillmentSelections: [{ vendorId: a.vendorId, method: "DELIVERY" as const, branchId: location.id }] };
    await OrderService.createOrder({ ...base, checkoutRequestId: randomUUID() });
    expect((await prisma.branchInventory.findFirstOrThrow()).onHandQuantity).toBe(0); expect((await prisma.product.findUniqueOrThrow({ where: { id: a.productId } })).inventoryCount).toBe(8);
    expect(await prisma.inventoryMovement.count({ where: { movementType: "SALE" } })).toBe(1);
    await expect(OrderService.createOrder({ ...base, checkoutRequestId: randomUUID(), items: [{ productId: a.productId, quantity: 1 }] })).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });
    expect((await prisma.product.findUniqueOrThrow({ where: { id: a.productId } })).inventoryCount).toBe(8);
  });

  it("makes restock and adjustment idempotent and prevents canonical stock from undercutting allocations", async () => {
    const a = await vendor(1); auth.actor = a.ownerId;
    const location = await prisma.shopBranch.create({ data: { ...branch("Warehouse"), shopId: a.vendorId } });
    await BranchInventoryService.enable();
    const allocateKey = randomUUID();
    await BranchInventoryService.mutate({ requestId: allocateKey, branchId: location.id, productId: a.productId, operation: "ALLOCATE", quantity: 6 });
    const replay = await BranchInventoryService.mutate({ requestId: allocateKey, branchId: location.id, productId: a.productId, operation: "ALLOCATE", quantity: 6 });
    expect(replay.replayed).toBe(true);
    expect((await prisma.branchInventory.findFirstOrThrow()).onHandQuantity).toBe(6);
    await expect(VendorInventoryService.adjust({ productId: a.productId, operation: "SET", quantity: 5, reason: "CORRECTION" })).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });
    const restockKey = randomUUID();
    await BranchInventoryService.mutate({ requestId: restockKey, branchId: location.id, productId: a.productId, operation: "RESTOCK", quantity: 4, reason: "Supplier delivery" });
    await BranchInventoryService.mutate({ requestId: restockKey, branchId: location.id, productId: a.productId, operation: "RESTOCK", quantity: 4, reason: "Supplier delivery" });
    expect((await prisma.product.findUniqueOrThrow({ where: { id: a.productId } })).inventoryCount).toBe(14);
    expect((await prisma.branchInventory.findFirstOrThrow()).onHandQuantity).toBe(10);
    await BranchInventoryService.mutate({ requestId: randomUUID(), branchId: location.id, productId: a.productId, operation: "ADJUST", quantity: -2, reason: "Damaged during count" });
    expect((await prisma.product.findUniqueOrThrow({ where: { id: a.productId } })).inventoryCount).toBe(12);
    expect(await prisma.inventoryMovement.count()).toBe(3);
  });

  it("reports basket availability without exposing branch quantities", async () => {
    const a = await vendor(1); auth.actor = a.ownerId;
    const stocked = await prisma.shopBranch.create({ data: { ...branch("Stocked"), shopId: a.vendorId } });
    const empty = await prisma.shopBranch.create({ data: { ...branch("Empty", { isPrimary: false }), shopId: a.vendorId } });
    await BranchInventoryService.enable();
    await BranchInventoryService.allocate({ branchId: stocked.id, productId: a.productId, quantity: 2 });
    const result = await getBasketBranchAvailability(a.vendorId, [{ productId: a.productId, quantity: 2 }]);
    expect(result?.branches).toEqual(expect.arrayContaining([expect.objectContaining({ id: stocked.id, status: "AVAILABLE" }), expect.objectContaining({ id: empty.id, status: "INSUFFICIENT_STOCK" })]));
    expect(JSON.stringify(result)).not.toContain("onHandQuantity");
  });
});
