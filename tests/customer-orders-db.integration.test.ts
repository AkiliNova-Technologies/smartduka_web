import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ actor: "customer-a" }));
vi.mock("@/lib/auth/session", () => ({
  requireActiveUserId: async () => auth.actor,
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {},
  AccountInactiveError: class AccountInactiveError extends Error {},
}));
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn(), revalidateTag: vi.fn(), updateTag: vi.fn(), revalidatePath: vi.fn() }));

import { prisma } from "@/lib/prisma/client";
import { OrderService } from "@/services/order";
import * as ordersRoute from "@/app/api/v1/orders/route";
import * as orderDetailRoute from "@/app/api/v1/orders/[id]/route";

const enabled = process.env.RUN_CUSTOMER_ORDERS_DB_TESTS === "1";
const ids = {
  customerA: "customer-a",
  customerB: "customer-b",
  vendorOwnerA: "vendor-owner-a",
  vendorOwnerB: "vendor-owner-b",
  vendorA: "vendor-a",
  vendorB: "vendor-b",
  standardProduct: "product-standard",
  variantProduct: "product-with-variant",
  variant: "variant-crimson-large",
};

async function assertSafeTarget() {
  const configured = process.env.DATABASE_URL;
  if (process.env.CUSTOMER_ORDERS_TEST_DATABASE !== "isolated-local" || !configured) throw new Error("Refusing customer-order fixture setup without the isolated test marker.");
  const target = new URL(configured);
  if (target.hostname !== "127.0.0.1" || target.pathname !== "/mwezora_customer_orders_tests") throw new Error("Refusing customer-order fixture setup outside the disposable loopback database.");
}

async function seedVendor(input: { ownerId: string; vendorId: string; index: number; productId: string; variant?: boolean }) {
  await prisma.user.create({ data: { id: input.ownerId, name: `Fixture Vendor ${input.index}`, email: `vendor-${input.index}@orders.test`, status: "ACTIVE", platformRole: "VENDOR", vendorRole: "OWNER" } });
  await prisma.vendorProfile.create({ data: { id: input.vendorId, ownerId: input.ownerId, storeName: `Fixture Shop ${input.index}`, slug: `fixture-shop-${input.index}`, status: "ACTIVE" } });
  // Owners also need the explicit membership link used by authenticated vendor routes.
  await prisma.user.update({ where: { id: input.ownerId }, data: { vendorId: input.vendorId } });
  const image = input.index === 1 ? "/images/promotions/demo-home/fashion-desktop.webp" : "/images/promotions/demo-home/accessories-desktop.webp";
  const product = await prisma.product.create({ data: { id: input.productId, vendorId: input.vendorId, name: input.variant ? "Variant Jacket" : "Standard Basket", slug: input.variant ? "fixture-variant-jacket" : "fixture-standard-basket", basePrice: input.variant ? 90_000 : 130_000, inventoryCount: 100, status: "ACTIVE", images: { create: { url: image, isFeatured: true, sortOrder: 0 } } } });
  const branch = await prisma.shopBranch.create({ data: { id: `branch-${input.index}`, shopId: input.vendorId, name: input.index === 1 ? "Delivery Centre" : "Pickup Centre", slug: input.index === 1 ? "delivery-centre" : "pickup-centre", isPrimary: true, isActive: true, deliveryEnabled: input.index === 1, pickupEnabled: input.index === 2, addressLine: `${input.index} Acceptance Road`, city: "Kampala", district: "Nakawa", country: "Uganda", contactPhone: `070000000${input.index}`, deliveryAreas: input.index === 1 ? ["Nakawa"] : [], deliveryFee: input.index === 1 ? 3500 : null, deliveryEstimate: input.index === 1 ? "Same day" : null, pickupInstructions: input.index === 2 ? "Bring the order reference and photo ID." : null } });
  const account = await prisma.vendorPaymentAccount.create({ data: { id: `payment-account-${input.index}`, vendorId: input.vendorId, provider: "MTN_MOMO", merchantCode: `TEST-${input.index}`, merchantName: `Fixture Shop ${input.index}`, status: "VERIFIED", isDefault: true, verifiedAt: new Date("2026-01-01T00:00:00.000Z"), createdById: input.ownerId } });
  if (input.variant) await prisma.productVariant.create({ data: { id: ids.variant, productId: product.id, sku: "FIXTURE-JACKET-CRIMSON-L", name: "Crimson / Large", price: 95_000, inventoryCount: 100, options: { color: "Crimson", size: "Large" }, optionKey: "color=Crimson|size=Large" } });
  return { product, branch, account };
}

async function seed() {
  await assertSafeTarget();
  await prisma.user.createMany({ data: [
    { id: ids.customerA, name: "Acceptance Customer A", email: "customer-a@orders.test", status: "ACTIVE" },
    { id: ids.customerB, name: "Acceptance Customer B", email: "customer-b@orders.test", status: "ACTIVE" },
  ] });
  const shopA = await seedVendor({ ownerId: ids.vendorOwnerA, vendorId: ids.vendorA, index: 1, productId: ids.standardProduct });
  const shopB = await seedVendor({ ownerId: ids.vendorOwnerB, vendorId: ids.vendorB, index: 2, productId: ids.variantProduct, variant: true });
  const created = await OrderService.createOrder({
    userId: ids.customerA,
    checkoutRequestId: "acceptance-multi-vendor-order",
    items: [{ productId: ids.standardProduct, quantity: 2 }, { productId: ids.variantProduct, variantId: ids.variant, quantity: 1 }],
    shippingAddress: "Plot 10 Acceptance Avenue, Nakawa",
    shippingPhone: "0772123456",
    deliveryDistrict: "Nakawa",
    paymentGateway: "CASH_ON_DELIVERY",
    notes: "Call once on arrival.",
    fulfillmentSelections: [
      { vendorId: ids.vendorA, method: "DELIVERY", branchId: shopA.branch.id },
      { vendorId: ids.vendorB, method: "PICKUP", branchId: shopB.branch.id, pickupContact: "0782123456" },
    ],
  });
  await prisma.order.update({ where: { id: created.id }, data: { orderNumber: "ACC-ORDER-001", createdAt: new Date("2026-01-24T12:00:00.000Z") } });
  const suborders = await prisma.subOrder.findMany({ where: { orderId: created.id } });
  for (const suborder of suborders) {
    const successful = suborder.vendorId === ids.vendorA;
    await prisma.paymentIntent.create({ data: { orderId: created.id, subOrderId: suborder.id, vendorId: suborder.vendorId, vendorPaymentAccountId: successful ? shopA.account.id : shopB.account.id, provider: "MTN_MOMO", amount: suborder.vendorTotal, currency: "UGX", status: successful ? "SUCCESSFUL" : "PENDING", providerReference: successful ? "TEST-CONFIRMED-NO-PROVIDER-CALL" : null, idempotencyKey: `fixture-${suborder.id}`, confirmedAt: successful ? new Date("2026-01-24T12:01:00.000Z") : null } });
  }

  // Pagination-only fixtures are direct records; the multi-vendor record above is the checkout proof.
  for (let index = 2; index <= 23; index += 1) {
    const createdAt = new Date(Date.UTC(2026, 0, 25 - index, 12));
    const orderId = `pagination-order-${String(index).padStart(2, "0")}`;
    const subOrderId = `pagination-suborder-${String(index).padStart(2, "0")}`;
    await prisma.$transaction(async (tx) => {
      await tx.order.create({ data: { id: orderId, customerId: ids.customerA, orderNumber: `ACC-ORDER-${String(index).padStart(3, "0")}`, totalAmount: 10_000, currency: "UGX", subTotal: 10_000, totalShipping: 0, status: "PENDING", paymentGateway: "CASH_ON_DELIVERY", paymentStatus: "PENDING", shippingAddress: "Pagination fixture", shippingPhone: "0772123456", shippingEmail: "customer-a@orders.test", createdAt } });
      await tx.subOrder.create({ data: { id: subOrderId, orderId, vendorId: ids.vendorA, subOrderNumber: `ACC-SUB-${String(index).padStart(3, "0")}`, vendorSubTotal: 10_000, vendorShipping: 0, vendorTotal: 10_000, platformCommission: 0, status: index <= 6 ? "PROCESSING" : "PENDING", fulfillmentMethod: "DELIVERY", fulfillmentSnapshot: { deliveryAddress: "Pagination fixture", deliveryContact: "0772123456" } } });
      await tx.orderItem.create({ data: { orderId, subOrderId, productId: ids.standardProduct, quantity: 1, priceAtPurchase: 10_000, totalPrice: 10_000, productNameSnapshot: `Historical Basket ${index}` } });
    });
  }
  await prisma.order.create({ data: { id: "customer-b-order", customerId: ids.customerB, orderNumber: "B-ORDER-001", totalAmount: 20_000, currency: "UGX", subTotal: 20_000, totalShipping: 0, paymentGateway: "CASH_ON_DELIVERY", shippingAddress: "Customer B only", shippingPhone: "0700000000", shippingEmail: "customer-b@orders.test", createdAt: new Date("2026-01-26T12:00:00.000Z"), subOrders: { create: { vendorId: ids.vendorB, subOrderNumber: "B-SUB-001", vendorSubTotal: 20_000, vendorShipping: 0, vendorTotal: 20_000, platformCommission: 0, fulfillmentMethod: "PICKUP" } } } });
  return created.id;
}

describe.runIf(enabled).sequential("customer orders against isolated PostgreSQL", () => {
  let multiVendorOrderId = "";
  beforeAll(async () => { multiVendorOrderId = await seed(); }, 60_000);
  afterAll(async () => { await prisma.$disconnect(); });

  it("returns 10, 10, and 3 deterministic orders without gaps or overlap", async () => {
    const pages = await Promise.all([1, 2, 3].map((page) => OrderService.getUserOrdersPage(ids.customerA, { page, pageSize: 10, filter: "all" })));
    expect(pages.map((value) => value.orders.length)).toEqual([10, 10, 3]);
    expect(pages.map((value) => value.total)).toEqual([23, 23, 23]);
    const idsByPage = pages.map((value) => value.orders.map((order) => order.id));
    expect(new Set(idsByPage.flat()).size).toBe(23);
    const expected = await prisma.order.findMany({ where: { customerId: ids.customerA }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true } });
    expect(idsByPage.flat()).toEqual(expected.map((order) => order.id));
  });

  it("returns the same pagination contract through the authenticated API", async () => {
    auth.actor = ids.customerA;
    const response = await ordersRoute.GET(new Request("http://local.test/api/v1/orders?page=2&filter=all"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(10);
    expect(body.meta).toEqual({ page: 2, pageSize: 10, total: 23, pageCount: 3, hasMore: true });
    const filtered = await (await ordersRoute.GET(new Request("http://local.test/api/v1/orders?page=1&filter=in-progress"))).json();
    expect(filtered.meta.total).toBe(5);
    expect(filtered.data.every((order: { subOrders: Array<{ status: string }> }) => order.subOrders.some((suborder) => suborder.status === "PROCESSING"))).toBe(true);
  });

  it("serializes the persisted multi-vendor checkout from authoritative records", async () => {
    const order = await OrderService.getUserOrder(ids.customerA, multiVendorOrderId);
    expect(order).not.toBeNull();
    expect(order).toMatchObject({ orderNumber: "ACC-ORDER-001", subTotal: 355_000, totalShipping: 3500, totalAmount: 358_500, paymentStatus: "PARTIALLY_PAID" });
    expect(order!.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "Standard Basket", quantity: 2, price: 130_000, lineTotal: 260_000, image: "/images/promotions/demo-home/fashion-desktop.webp" }),
      expect.objectContaining({ name: "Variant Jacket", variantName: "Crimson / Large", variantOptions: { color: "Crimson", size: "Large" }, quantity: 1, price: 95_000, lineTotal: 95_000, image: "/images/promotions/demo-home/accessories-desktop.webp" }),
    ]));
    expect(order!.subOrders).toEqual(expect.arrayContaining([
      expect.objectContaining({ vendorName: "Fixture Shop 1", fulfillmentMethod: "DELIVERY", shipping: 3500, total: 263_500, deliveryAddress: "Plot 10 Acceptance Avenue, Nakawa" }),
      expect.objectContaining({ vendorName: "Fixture Shop 2", fulfillmentMethod: "PICKUP", shipping: 0, total: 95_000, branchName: "Pickup Centre", pickupLocation: "2 Acceptance Road", pickupInstructions: "Bring the order reference and photo ID." }),
    ]));
    expect(order!.subOrders.flatMap((suborder) => suborder.paymentIntents.map((intent) => intent.status)).sort()).toEqual(["PENDING", "SUCCESSFUL"]);
  });

  it("keeps service and detail API reads ownership-scoped", async () => {
    expect(await OrderService.getUserOrdersPage(ids.customerB, { page: 1, pageSize: 10, filter: "all" })).toMatchObject({ total: 1 });
    expect(await OrderService.getUserOrder(ids.customerB, multiVendorOrderId)).toBeNull();
    auth.actor = ids.customerB;
    const response = await orderDetailRoute.GET(new Request(`http://local.test/api/v1/orders/${multiVendorOrderId}`), { params: Promise.resolve({ id: multiVendorOrderId }) });
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBeNull();
  });
});
