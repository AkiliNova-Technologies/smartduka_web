import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PaymentIntentStatus, PaymentProvider } from "@prisma/client";

const provider = vi.hoisted(() => ({ submissions: [] as Array<{ reference: string }> }));
vi.mock("@/lib/payments/providers/mtn-momo-provider", () => ({
  MtnMomoProviderError: class MtnMomoProviderError extends Error {
    constructor(message: string, readonly code: string) { super(message); }
  },
  MtnMomoProvider: class {
    async initiatePayment(input: { reference: string }) {
      provider.submissions.push(input);
      return { providerReference: input.reference, status: "PENDING" };
    }
  },
  getMtnMomoConfig: () => ({
    environment: "sandbox",
    sandboxTesting: true,
    directVendorRoutingVerified: true,
  }),
}));

import { prisma } from "@/lib/prisma/client";
import { PaymentIntentService } from "@/services/payment-intent";
import { PaymentReconciliationService } from "@/services/payment-reconciliation";
import { PaymentStatusService } from "@/services/payment-status";

const enabled = process.env.RUN_CUSTOMER_ORDERS_DB_TESTS === "1";
const customerId = "payment-e2e-customer";
const orderId = "payment-e2e-order";
const subOrderA = "payment-e2e-sub-a";
const subOrderB = "payment-e2e-sub-b";

async function assertSafeTarget() {
  const configured = process.env.DATABASE_URL;
  if (process.env.CUSTOMER_ORDERS_TEST_DATABASE !== "isolated-local" || !configured)
    throw new Error("Refusing payment E2E setup without the isolated marker.");
  const target = new URL(configured);
  if (target.hostname !== "127.0.0.1" || target.pathname !== "/mwezora_customer_orders_tests")
    throw new Error("Refusing payment E2E setup outside disposable PostgreSQL.");
}

async function seed() {
  await assertSafeTarget();
  await prisma.user.create({ data: { id: customerId, name: "Payment Customer", email: "payment-customer@e2e.test", status: "ACTIVE" } });
  for (const suffix of ["a", "b"] as const) {
    const ownerId = `payment-owner-${suffix}`;
    const vendorId = `payment-vendor-${suffix}`;
    await prisma.user.create({ data: { id: ownerId, name: `Payment Owner ${suffix}`, email: `payment-owner-${suffix}@e2e.test`, status: "ACTIVE", platformRole: "VENDOR", vendorRole: "OWNER" } });
    await prisma.vendorProfile.create({ data: { id: vendorId, ownerId, storeName: `Payment Shop ${suffix}`, slug: `payment-shop-${suffix}`, status: "ACTIVE" } });
    await prisma.user.update({ where: { id: ownerId }, data: { vendorId } });
    await prisma.vendorPaymentAccount.create({ data: { id: `payment-account-${suffix}`, vendorId, provider: "MTN_MOMO", merchantCode: `E2E-${suffix}`, merchantName: `Payment Shop ${suffix}`, status: "VERIFIED", isDefault: true, verifiedAt: new Date(), createdById: ownerId } });
  }
  await prisma.order.create({ data: {
    id: orderId, customerId, orderNumber: "PAY-E2E-001", totalAmount: 33_500,
    currency: "UGX", subTotal: 30_000, totalShipping: 3_500,
    paymentGateway: "MTN_MOMO", paymentStatus: "PENDING", shippingAddress: "Isolated address",
    shippingPhone: "0772123456", shippingEmail: "payment-customer@e2e.test",
    subOrders: { create: [
      { id: subOrderA, vendorId: "payment-vendor-a", subOrderNumber: "PAY-E2E-A", vendorSubTotal: 20_000, vendorShipping: 3_500, vendorTotal: 23_500, platformCommission: 0, fulfillmentMethod: "DELIVERY" },
      { id: subOrderB, vendorId: "payment-vendor-b", subOrderNumber: "PAY-E2E-B", vendorSubTotal: 10_000, vendorShipping: 0, vendorTotal: 10_000, platformCommission: 0, fulfillmentMethod: "PICKUP" },
    ] },
  } });
}

describe.runIf(enabled).sequential("payment lifecycle against isolated PostgreSQL", () => {
  beforeAll(seed, 60_000);
  afterAll(async () => prisma.$disconnect());

  it("serializes same-key and different-key initiation into one collectible attempt per suborder", async () => {
    const base = { customerId, orderId, provider: PaymentProvider.MTN_MOMO };
    const same = await Promise.all([
      PaymentIntentService.initiateForCustomer({ ...base, subOrderId: subOrderA, idempotencyKey: "e2e-same-key" }),
      PaymentIntentService.initiateForCustomer({ ...base, subOrderId: subOrderA, idempotencyKey: "e2e-same-key" }),
    ]);
    expect(same[0].id).toBe(same[1].id);
    const different = await Promise.allSettled([
      PaymentIntentService.initiateForCustomer({ ...base, subOrderId: subOrderB, idempotencyKey: "e2e-different-a" }),
      PaymentIntentService.initiateForCustomer({ ...base, subOrderId: subOrderB, idempotencyKey: "e2e-different-b" }),
    ]);
    expect(different.filter((value) => value.status === "fulfilled")).toHaveLength(1);
    expect(different.find((value) => value.status === "rejected")).toMatchObject({ reason: { code: "PAYMENT_ALREADY_PENDING" } });
    expect(provider.submissions).toHaveLength(2);
    expect(await prisma.paymentIntent.count({ where: { orderId } })).toBe(2);
  });

  it("keeps exact vendor destinations, amounts, shipping, and zero commission", async () => {
    const suborders = await prisma.subOrder.findMany({ where: { orderId }, orderBy: { id: "asc" }, include: { paymentIntents: { include: { vendorPaymentAccount: true } } } });
    expect(suborders.map((value) => ({ total: value.vendorTotal.toNumber(), shipping: value.vendorShipping.toNumber(), commission: value.platformCommission.toNumber(), vendor: value.vendorId, destinationVendor: value.paymentIntents[0].vendorPaymentAccount.vendorId }))).toEqual([
      { total: 23_500, shipping: 3_500, commission: 0, vendor: "payment-vendor-a", destinationVendor: "payment-vendor-a" },
      { total: 10_000, shipping: 0, commission: 0, vendor: "payment-vendor-b", destinationVendor: "payment-vendor-b" },
    ]);
    expect(new Set(suborders.flatMap((value) => value.paymentIntents.map((intent) => intent.providerReference))).size).toBe(2);
  });

  it("represents partial success and completes the parent only after both suborders succeed", async () => {
    const intents = await prisma.paymentIntent.findMany({ where: { orderId }, orderBy: { subOrderId: "asc" } });
    const apply = (index: number, suffix: string) => PaymentReconciliationService.applyProviderResult({
      paymentIntentId: intents[index].id, provider: PaymentProvider.MTN_MOMO,
      providerReference: intents[index].providerReference!, providerEventId: `e2e-event-${suffix}`,
      eventType: `E2E_CALLBACK_${suffix}`, status: PaymentIntentStatus.SUCCESSFUL,
      amount: intents[index].amount.toFixed(2), currency: intents[index].currency,
      payload: { fixture: suffix },
    });
    await expect(apply(0, "A")).resolves.toMatchObject({ outcome: "TRANSITION_APPLIED" });
    expect(await prisma.order.findUniqueOrThrow({ where: { id: orderId }, select: { paymentStatus: true } })).toMatchObject({ paymentStatus: "PENDING" });
    expect(await PaymentStatusService.getCustomerOrderPaymentStatus(customerId, orderId)).toMatchObject({ paymentStatus: "PARTIALLY_PAID", paidAmount: 23_500, outstandingAmount: 10_000 });
    await expect(apply(0, "A")).resolves.toMatchObject({ outcome: "DUPLICATE" });
    await expect(apply(1, "B")).resolves.toMatchObject({ outcome: "TRANSITION_APPLIED" });
    expect(await prisma.order.findUniqueOrThrow({ where: { id: orderId }, select: { paymentStatus: true } })).toMatchObject({ paymentStatus: "COMPLETED" });
    expect(await PaymentStatusService.getCustomerOrderPaymentStatus(customerId, orderId)).toMatchObject({ paymentStatus: "SUCCESSFUL", paidAmount: 33_500, outstandingAmount: 0 });
  });

  it("does not expose the payment projection to another customer", async () => {
    expect(await PaymentStatusService.getCustomerOrderPaymentStatus("customer-a", orderId)).toBeNull();
  });
});
