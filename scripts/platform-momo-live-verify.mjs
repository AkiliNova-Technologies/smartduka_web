/**
 * Deliberately CLI-only, one-charge controlled-live qualification. It never
 * creates a subscription or promotion; its records are auditable test records.
 */
import { randomUUID } from "node:crypto";
import { PrismaClient, PaymentProvider } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PlatformPaymentReconciliationService } from "../src/services/platform-payment-reconciliation.ts";

const required = [
  "PLATFORM_MTN_BASE_URL", "PLATFORM_MTN_COLLECTION_SUBSCRIPTION_KEY",
  "PLATFORM_MTN_API_USER", "PLATFORM_MTN_API_KEY", "PLATFORM_MTN_MERCHANT_CODE",
  "PLATFORM_MTN_LIVE_TEST_VENDOR_ID", "PLATFORM_MTN_LIVE_TEST_QUALIFICATION_ID",
  "PLATFORM_MTN_LIVE_TEST_MSISDN", "PLATFORM_MTN_LIVE_TEST_AMOUNT", "PLATFORM_MTN_LIVE_TEST_CURRENCY",
];
const value = (key) => process.env[key]?.trim() ?? "";
const fail = (message) => { throw new Error(`REFUSE TO RUN: ${message}`); };
const safeReference = (reference) => reference ? `••••${reference.slice(-8)}` : "unavailable";
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function validateConfiguration() {
  if (value("PLATFORM_MTN_ENVIRONMENT") !== "production") fail("controlled live qualification requires PLATFORM_MTN_ENVIRONMENT=production.");
  if (value("PLATFORM_MTN_LIVE_TEST_ENABLED") !== "true") fail("controlled live qualification is disabled.");
  if (value("PLATFORM_MTN_PRODUCTION_ENABLED") === "true") fail("production charging is enabled.");
  if (value("PLATFORM_MTN_LIVE_TEST_CONFIRM_REAL_MONEY") !== "true") fail("controlled live qualification requires explicit real-money confirmation.");
  const missing = required.filter((key) => !value(key));
  if (missing.length) fail(`live qualification configuration is incomplete: ${missing.join(", ")}.`);
  if (value("PLATFORM_MTN_MERCHANT_CODE") !== "27365727") fail("the controlled qualification merchant must be 27365727.");
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(value("PLATFORM_MTN_LIVE_TEST_QUALIFICATION_ID"))) fail("PLATFORM_MTN_LIVE_TEST_QUALIFICATION_ID must be a new safe identifier (8-100 letters, digits, _ or -).");
  const amount = Number(value("PLATFORM_MTN_LIVE_TEST_AMOUNT"));
  if (!Number.isFinite(amount) || amount <= 0 || amount >= 10_000 || [10_000, 20_000, 25_000, 60_000].includes(amount)) fail("the live qualification amount must be a separate small positive amount, below UGX 10,000, not a plan or promotion price.");
  if (value("PLATFORM_MTN_LIVE_TEST_CURRENCY") !== "UGX") fail("controlled live qualification currency must be UGX.");
}

async function providerStatus(base, headers, reference) {
  const response = await fetch(`${base}/collection/v1_0/requesttopay/${reference}`, { headers, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Provider status lookup: FAIL (${response.status})`);
  return response.json();
}

function report({ intent, order, marketplaceBefore, marketplaceAfter, sellerOrdersBefore, sellerOrdersAfter, providerState, callback }) {
  console.log(`SmartDuka Platform MTN Controlled Live Qualification

Environment: live-test
Merchant configured: YES
Merchant code: ••••5727

OAuth: PASS
RequestToPay: PASS
HTTP 202: PASS

Provider status lookup: PASS
Provider final status: ${providerState}
Trusted reconciliation: PASS

PlatformPaymentIntent: ${intent.status}
PlatformRevenueOrder: ${order.status}
Qualification record ID: ${order.qualificationId}
Safe provider reference: ${safeReference(intent.providerReference)}

Marketplace PaymentIntent touched: ${marketplaceBefore === marketplaceAfter ? "NO" : "YES"}
Seller order payment touched: ${sellerOrdersBefore === sellerOrdersAfter ? "NO" : "YES"}

Merchant receipt verification: MANUAL CHECK REQUIRED
Real callback delivery: ${callback ? "VERIFIED" : "UNVERIFIED"}

General platform production charging: DISABLED
Marketplace direct vendor routing: UNVERIFIED`);
}

async function main() {
  validateConfiguration();
  const base = value("PLATFORM_MTN_BASE_URL").replace(/\/$/, "");
  const qualificationId = value("PLATFORM_MTN_LIVE_TEST_QUALIFICATION_ID");
  const amount = value("PLATFORM_MTN_LIVE_TEST_AMOUNT");
  const currency = value("PLATFORM_MTN_LIVE_TEST_CURRENCY");
  const payer = value("PLATFORM_MTN_LIVE_TEST_MSISDN").replace(/[\s()-]/g, "");
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const vendor = await prisma.vendorProfile.findUnique({ where: { id: value("PLATFORM_MTN_LIVE_TEST_VENDOR_ID") }, select: { id: true } });
    if (!vendor) fail("PLATFORM_MTN_LIVE_TEST_VENDOR_ID is not a qualification vendor.");

    const existing = await prisma.platformRevenueOrder.findFirst({
      where: { vendorId: vendor.id, qualificationId }, include: { paymentIntents: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    if (existing && (existing.qualificationKind !== "LIVE_QUALIFICATION" || !existing.paymentIntents[0])) fail("qualification ID is already reserved by a non-live record.");
    // Counts alone can conceal a state swap, so compare the complete aggregate
    // payment-state snapshots on each side of this platform-only operation.
    const marketplaceSnapshot = async () => JSON.stringify(await prisma.paymentIntent.groupBy({ by: ["status"], _count: { id: true }, orderBy: { status: "asc" } }));
    const sellerOrderSnapshot = async () => JSON.stringify(await prisma.order.groupBy({ by: ["paymentStatus"], _count: { id: true }, orderBy: { paymentStatus: "asc" } }));
    const marketplaceBefore = await marketplaceSnapshot();
    const sellerOrdersBefore = await sellerOrderSnapshot();

    let order = existing;
    let intent = existing?.paymentIntents[0];
    let submitted = false;
    if (!order) {
      const reference = randomUUID();
      order = await prisma.platformRevenueOrder.create({ data: {
        vendorId: vendor.id, type: "FUTURE_SERVICE", status: "AWAITING_PAYMENT", subtotal: amount,
        creditApplied: 0, amountDue: amount, currency, qualificationKind: "LIVE_QUALIFICATION",
        qualificationId, idempotencyKey: `LIVE_QUALIFICATION:${qualificationId}`,
      } });
      // Persist PENDING before submission. A timeout after submission can then
      // only be resumed by status lookup for this exact reference, never recharged.
      intent = await prisma.platformPaymentIntent.create({ data: {
        platformRevenueOrderId: order.id, vendorId: vendor.id, provider: PaymentProvider.MTN_MOMO,
        amount, currency, status: "PENDING", providerReference: reference,
        idempotencyKey: `LIVE_QUALIFICATION:${qualificationId}`,
        merchantDestinationMasked: "••••5727", nextReconcileAt: new Date(Date.now() + 120_000),
      } });
      submitted = true;
    }

    const tokenResponse = await fetch(`${base}/collection/token/`, { method: "POST", headers: {
      Authorization: `Basic ${Buffer.from(`${value("PLATFORM_MTN_API_USER")}:${value("PLATFORM_MTN_API_KEY")}`).toString("base64")}`,
      "Ocp-Apim-Subscription-Key": value("PLATFORM_MTN_COLLECTION_SUBSCRIPTION_KEY"),
    }, signal: AbortSignal.timeout(10_000) });
    if (!tokenResponse.ok) throw new Error(`OAuth: FAIL (${tokenResponse.status})`);
    const token = await tokenResponse.json();
    if (typeof token?.access_token !== "string") throw new Error("OAuth: FAIL (malformed response)");
    const headers = { Authorization: `Bearer ${token.access_token}`, "Ocp-Apim-Subscription-Key": value("PLATFORM_MTN_COLLECTION_SUBSCRIPTION_KEY"), "X-Target-Environment": value("PLATFORM_MTN_TARGET_ENVIRONMENT") || "production" };

    if (submitted) {
      try {
        const response = await fetch(`${base}/collection/v1_0/requesttopay`, { method: "POST", headers: { ...headers, "X-Reference-Id": intent.providerReference, "Content-Type": "application/json" }, body: JSON.stringify({
          amount, currency, externalId: `SMARTDUKA-LIVE-QUAL-${qualificationId}`,
          payer: { partyIdType: "MSISDN", partyId: payer },
          payerMessage: "SmartDuka platform qualification", payeeNote: "SmartDuka qualification",
        }), signal: AbortSignal.timeout(12_000) });
        if (response.status !== 202) throw new Error(`RequestToPay: FAIL (${response.status})`);
      } catch (error) {
        await prisma.platformPaymentIntent.update({ where: { id: intent.id }, data: { lastReconcileError: "Submission outcome is uncertain; reconcile this reference before any further action.", nextReconcileAt: new Date() } });
        throw error;
      }
    }

    let provider = { status: "PENDING" };
    for (const delay of [0, 5_000, 8_000, 12_000, 15_000, 20_000]) {
      if (delay) await pause(delay);
      provider = await providerStatus(base, headers, intent.providerReference);
      if (provider.status !== "PENDING") break;
    }
    if (provider.status !== "SUCCESSFUL") {
      await prisma.platformPaymentIntent.update({ where: { id: intent.id }, data: { lastReconcileError: "Provider is not final; rerun with the same qualification ID to reconcile only.", nextReconcileAt: new Date() } });
      throw new Error(`Provider final status: ${provider.status ?? "PENDING"}. No replacement payment was submitted.`);
    }
    const reconciliation = await PlatformPaymentReconciliationService.applyTrustedResult(intent.id, "SUCCESSFUL", String(provider.amount), provider.currency);
    const [storedIntent, storedOrder, marketplaceAfter, sellerOrdersAfter] = await Promise.all([
      prisma.platformPaymentIntent.findUniqueOrThrow({ where: { id: intent.id } }),
      prisma.platformRevenueOrder.findUniqueOrThrow({ where: { id: order.id } }),
      marketplaceSnapshot(), sellerOrderSnapshot(),
    ]);
    if (reconciliation.outcome !== "TRANSITION_APPLIED" || storedIntent.status !== "SUCCESSFUL" || storedOrder.status !== "PAID") throw new Error("Trusted reconciliation: FAIL");
    if (marketplaceBefore !== marketplaceAfter || sellerOrdersBefore !== sellerOrdersAfter) throw new Error("Marketplace isolation: FAIL");
    report({ intent: storedIntent, order: storedOrder, marketplaceBefore, marketplaceAfter, sellerOrdersBefore, sellerOrdersAfter, providerState: provider.status, callback: value("PLATFORM_MTN_LIVE_TEST_CALLBACK_VERIFIED") === "true" });
  } finally { await prisma.$disconnect(); await pool.end(); }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Controlled live qualification failed."); process.exitCode = 1; });
