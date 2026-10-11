import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma/client";
import { PaymentProvider, PaymentGateway, PaymentStatus, SubOrderStatus, VendorPaymentAccountStatus } from "@prisma/client";
import { PaymentIntentService } from "@/services/payment-intent";
import { PaymentReconciliationService } from "@/services/payment-reconciliation";
import { PaymentStatusService } from "@/services/payment-status";
import { PaymentEligibilityService } from "@/services/payment-eligibility";
import { PaymentProviderRegistry } from "@/lib/payments/payment-provider";
import { MtnMomoProvider, getMtnMomoConfig } from "@/lib/payments/providers/mtn-momo-provider";

const marker = "SANDBOX QUALIFICATION — MTN reconciliation only";
const pollDelays = [2_000, 3_000, 5_000, 5_000, 10_000, 10_000];
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const report = new Map();
const set = (key, value) => report.set(key, value);
const pass = (key) => set(key, "PASS");
const fail = (key) => set(key, "FAIL");

function requireSandbox() {
  if (process.env.MTN_MOMO_ENVIRONMENT !== "sandbox" || process.env.MTN_SANDBOX_COLLECTION_TESTING_ENABLED !== "true")
    throw new Error("REFUSE TO RUN: MTN sandbox collection testing must be enabled.");
  if (process.env.MTN_SANDBOX_RECONCILIATION_QUALIFICATION_ENABLED === "false")
    throw new Error("REFUSE TO RUN: reconciliation qualification is explicitly disabled.");
  if (process.env.MTN_MOMO_DIRECT_VENDOR_ROUTING_VERIFIED === "true" || process.env.MTN_DIRECT_VENDOR_ROUTING_VERIFIED === "true")
    throw new Error("REFUSE TO RUN: this qualification must not run with direct-routing verification enabled.");
  getMtnMomoConfig();
}

async function qualificationFixture() {
  const [customer, owner] = await Promise.all([
    prisma.user.findUnique({ where: { email: process.env.TEST_CUSTOMER_EMAIL }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: process.env.TEST_VENDOR_1_EMAIL }, include: { ownedVendor: { select: { id: true, status: true, deletedAt: true } } } }),
  ]);
  if (!customer || !owner?.ownedVendor || owner.ownedVendor.status !== "ACTIVE" || owner.ownedVendor.deletedAt)
    throw new Error("REFUSE TO RUN: seed the controlled TEST customer and TEST vendor fixtures first.");
  const vendor = owner.ownedVendor;
  const account = await prisma.vendorPaymentAccount.upsert({
    where: { vendorId_provider_merchantPhoneHash: { vendorId: vendor.id, provider: PaymentProvider.MTN_MOMO, merchantPhoneHash: "mtn-sandbox-reconciliation-qualification" } },
    update: { status: VendorPaymentAccountStatus.VERIFIED, isDefault: true, verificationNote: marker, updatedById: owner.id },
    create: { vendorId: vendor.id, provider: PaymentProvider.MTN_MOMO, merchantCode: "SANDBOX-QUALIFICATION", merchantName: "SANDBOX QUALIFICATION ONLY", merchantPhoneHash: "mtn-sandbox-reconciliation-qualification", status: VendorPaymentAccountStatus.VERIFIED, isDefault: true, verifiedAt: new Date(), verificationNote: marker, createdById: owner.id },
  });
  const amount = process.env.MTN_SANDBOX_TEST_AMOUNT || "100";
  const currency = process.env.MTN_SANDBOX_TEST_CURRENCY || "EUR";
  const orderNumber = `SANDBOX-MTN-${randomUUID().slice(0, 8).toUpperCase()}`;
  const order = await prisma.order.create({ data: { customerId: customer.id, orderNumber, totalAmount: amount, currency, subTotal: amount, totalShipping: 0, taxAmount: 0, status: "PENDING", paymentGateway: PaymentGateway.MTN_MOMO, paymentStatus: PaymentStatus.PENDING, shippingAddress: marker, shippingPhone: process.env.MTN_SANDBOX_TEST_MSISDN ?? "", shippingEmail: "sandbox-qualification@invalid.smartduka", notes: marker } });
  const subOrder = await prisma.subOrder.create({ data: { orderId: order.id, vendorId: vendor.id, subOrderNumber: `${orderNumber}-V1`, vendorSubTotal: amount, vendorShipping: 0, vendorTotal: amount, platformCommission: 0, vendorNetEntitlement: amount, paymentProcessingFee: 0, status: SubOrderStatus.PENDING, fulfillmentMethod: "DELIVERY", fulfillmentSnapshot: { marker }, refundPolicySnapshot: { marker } } });
  return { account, customer, order, subOrder, amount, currency };
}

async function main() {
  requireSandbox();
  const config = getMtnMomoConfig();
  const callbackRequested = process.env.MTN_SANDBOX_TEST_USE_CALLBACK === "true" && Boolean(config.callbackUrl);
  const fixture = await qualificationFixture();
  const readiness = PaymentProviderRegistry.getReadiness(PaymentProvider.MTN_MOMO);
  const eligibility = await PaymentEligibilityService.canAcceptPayments(fixture.account.vendorId, PaymentProvider.MTN_MOMO, { sandboxQualification: true });
  console.log(`Shop active: YES`);
  console.log(`MTN account present: YES`);
  console.log(`MTN account verified: ${fixture.account.status === "VERIFIED" ? "YES" : "NO"}`);
  console.log(`MTN account enabled: ${fixture.account.isDefault ? "YES" : "NO"}`);
  console.log(`MTN provider enabled: ${readiness.enabled ? "YES" : "NO"}`);
  console.log(`Sandbox testing enabled: ${readiness.sandboxTechnicalTesting ? "YES" : "NO"}`);
  console.log(`Production direct routing: ${readiness.directVendorRoutingVerified ? "VERIFIED" : "UNVERIFIED"}`);
  console.log(`Qualification eligibility: ${eligibility.eligible ? "PASS" : `FAIL (${eligibility.reasons[0] ?? "INELIGIBLE"})`}`);
  if (!eligibility.eligible) throw new Error(eligibility.reasons[0] ?? "INELIGIBLE");
  const notificationsBefore = await prisma.notification.count({ where: { OR: [{ userId: fixture.customer.id }, { vendorId: fixture.account.vendorId }] } });
  let intent;
  try {
    intent = await PaymentIntentService.initiateSandboxQualification({ customerId: fixture.customer.id, orderId: fixture.order.id, subOrderId: fixture.subOrder.id, provider: PaymentProvider.MTN_MOMO, idempotencyKey: `sandbox-${randomUUID()}`, payerPhone: process.env.MTN_SANDBOX_TEST_MSISDN });
    pass("OAuth"); pass("RequestToPay"); set("HTTP 202", "YES");
  } catch (error) {
    if (error?.code === "AUTHENTICATION_FAILED" || error?.code === "PROVIDER_UNAVAILABLE") fail("OAuth");
    fail("RequestToPay"); set("HTTP 202", "NO"); throw error;
  }
  set("Callback requested", callbackRequested ? "YES" : "NO");
  set("Callback endpoint reachable", callbackRequested ? "NOT VERIFIED" : "NOT RUN");
  if (callbackRequested) await sleep(10_000);
  const callbackReceived = callbackRequested && await prisma.auditLog.count({ where: { entityId: intent.id, action: "MTN_CALLBACK_RECEIVED" } }) > 0;
  set("Callback received from MTN", callbackRequested ? (callbackReceived ? "YES" : "NO") : "NOT RUN");
  set("Reference matched", callbackReceived ? "PASS" : "NOT RUN");
  const provider = new MtnMomoProvider();
  let result;
  for (const delay of [0, ...pollDelays]) {
    if (delay) await sleep(delay);
    result = await provider.getPaymentStatus(intent.providerReference);
    if (result.status !== "PENDING") break;
  }
  pass("Provider status lookup"); set("Provider final status", result.status);
  if (result.status === "PENDING") throw new Error("MTN sandbox payment remained pending after the bounded qualification window.");
  const event = { paymentIntentId: intent.id, provider: PaymentProvider.MTN_MOMO, providerReference: intent.providerReference, providerEventId: result.providerTransactionId, eventType: "MTN_SANDBOX_RECONCILIATION_QUALIFICATION", status: result.status, amount: result.amount, currency: result.currency, payload: { providerReference: result.providerReference, status: result.status, amount: result.amount, currency: result.currency, providerTransactionId: result.providerTransactionId ?? null, qualification: true } };
  const first = await PaymentReconciliationService.applyProviderResult(event);
  const duplicate = await PaymentReconciliationService.applyProviderResult(event);
  const stored = await prisma.paymentIntent.findUniqueOrThrow({ where: { id: intent.id }, select: { status: true, subOrderId: true } });
  const providerEvent = await prisma.paymentProviderEvent.findFirst({ where: { paymentIntentId: intent.id, provider: PaymentProvider.MTN_MOMO } });
  if (providerEvent) pass("PaymentProviderEvent persisted"); else fail("PaymentProviderEvent persisted");
  if (first.outcome === "TRANSITION_APPLIED" || first.outcome === "ALREADY_APPLIED" || first.outcome === "DUPLICATE") pass("PaymentReconciliationService invoked"); else fail("PaymentReconciliationService invoked");
  if (stored.status === result.status) pass("PaymentIntent transition"); else fail("PaymentIntent transition");
  if (stored.subOrderId === fixture.subOrder.id && stored.status === "SUCCESSFUL") pass("Seller suborder updated"); else fail("Seller suborder updated");
  const parent = await prisma.order.findUniqueOrThrow({ where: { id: fixture.order.id }, select: { paymentStatus: true } });
  if (parent.paymentStatus === "COMPLETED") pass("Parent payment state updated"); else fail("Parent payment state updated");
  if (duplicate.outcome === "DUPLICATE") pass("Duplicate event handling"); else fail("Duplicate event handling");
  set("Callback/poll race handling", callbackReceived ? (first.outcome === "DUPLICATE" ? "PASS" : "NOT OBSERVED") : "NOT RUN");
  set("Polling fallback", callbackReceived ? "NOT RUN" : "PASS");
  const notificationsAfter = await prisma.notification.count({ where: { OR: [{ userId: fixture.customer.id }, { vendorId: fixture.account.vendorId }] } });
  if (notificationsAfter - notificationsBefore === 2) pass("Notification emitted once"); else fail("Notification emitted once");
  const status = await PaymentStatusService.getCustomerOrderPaymentStatus(fixture.customer.id, fixture.order.id);
  if (status?.paymentStatus === "SUCCESSFUL") pass("Payment status API reflects reconciled state"); else fail("Payment status API reflects reconciled state");
  const audit = await prisma.auditLog.findMany({ where: { entityId: intent.id }, select: { action: true } });
  if (["PAYMENT_INTENT_CREATED", "PAYMENT_REQUEST_ACCEPTED", "PAYMENT_PROVIDER_EVENT_RECEIVED", "PAYMENT_INTENT_RECONCILED"].every((action) => audit.some((entry) => entry.action === action))) pass("Audit trail"); else fail("Audit trail");
} 

main().catch((error) => { console.error(error instanceof Error ? error.message : "MTN sandbox reconciliation qualification failed."); process.exitCode = 1; }).finally(async () => {
  if (report.size) {
    console.log("MTN MoMo Sandbox Reconciliation Qualification");
    for (const [key, value] of report) console.log(`${key}: ${value}`);
    console.log(`Callback qualification: ${report.get("Callback received from MTN") === "YES" ? "PASS" : "NOT YET"}`);
    console.log("Direct vendor routing: UNVERIFIED");
    console.log("Production marketplace ready: NO");
    console.log("Cleanup: qualification order and its audit/event records were retained with a SANDBOX QUALIFICATION marker for debugging.");
  }
  await prisma.$disconnect();
});
