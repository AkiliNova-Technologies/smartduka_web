import { randomUUID } from "node:crypto";
import { PaymentProvider, PlatformPaymentIntentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { platformRevenueConfig } from "@/lib/platform-revenue/config";
import { MtnMomoProvider } from "@/lib/payments/providers/mtn-momo-provider";
import type { PaymentProviderAdapter } from "@/lib/payments/payment-provider";
import { PromotionInventoryService, type PromotionTransaction } from "@/services/promotion-inventory";
import { VendorSubscriptionService } from "@/services/vendor-subscriptions";

const terminal = new Set<PlatformPaymentIntentStatus>(["FAILED", "CANCELLED", "EXPIRED", "REVERSED"]);
const platformMtnEnvironment = (): NodeJS.ProcessEnv => ({ ...process.env, MTN_MOMO_ENVIRONMENT: process.env.PLATFORM_MTN_ENVIRONMENT, MTN_MOMO_BASE_URL: process.env.PLATFORM_MTN_BASE_URL, MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY: process.env.PLATFORM_MTN_COLLECTION_SUBSCRIPTION_KEY, MTN_MOMO_API_USER: process.env.PLATFORM_MTN_API_USER, MTN_MOMO_API_KEY: process.env.PLATFORM_MTN_API_KEY, MTN_MOMO_TARGET_ENVIRONMENT: process.env.PLATFORM_MTN_TARGET_ENVIRONMENT, MTN_SANDBOX_COLLECTION_TESTING_ENABLED: process.env.PLATFORM_MTN_SANDBOX_TESTING_ENABLED, MTN_SANDBOX_TEST_CURRENCY: "UGX" });

/** Vendor-to-SmartDuka payment boundary. It never reads marketplace PaymentIntent. */
export class PlatformPaymentService {
  static readiness() {
    const configured = platformRevenueConfig.platformMtnConfigured && Boolean(process.env.PLATFORM_MTN_BASE_URL && process.env.PLATFORM_MTN_COLLECTION_SUBSCRIPTION_KEY && process.env.PLATFORM_MTN_API_USER && process.env.PLATFORM_MTN_API_KEY);
    const sandboxReady = platformRevenueConfig.platformMtnEnabled && configured && platformRevenueConfig.platformMtnSandboxTesting;
    return { provider: "MTN", enabled: platformRevenueConfig.platformMtnEnabled, merchantConfigured: platformRevenueConfig.platformMtnConfigured, configured, environment: platformRevenueConfig.platformMtnEnvironment, sandboxTesting: platformRevenueConfig.platformMtnSandboxTesting, liveTestEnabled: platformRevenueConfig.platformMtnLiveTestEnabled, productionEnabled: platformRevenueConfig.platformMtnProductionEnabled, ready: sandboxReady, readiness: !configured ? "NOT_CONFIGURED" : sandboxReady ? "SANDBOX_READY" : platformRevenueConfig.platformMtnLiveTestEnabled ? "LIVE_TEST_READY" : "NOT_CONFIGURED", productionReady: false };
  }

  static async initiate(input: { vendorId: string; revenueOrderId: string; payerPhone: string; idempotencyKey: string; actorUserId?: string }, testProvider?: PaymentProviderAdapter) {
    if(testProvider&&process.env.NODE_ENV!=="test")throw new Error("Payment test adapters are available only in the test environment.");
    const readiness = this.readiness();
    if (!readiness.ready) throw new Error("Platform MTN payment initiation is available only for explicitly enabled sandbox qualification.");
    const candidate = await prisma.platformRevenueOrder.findFirst({ where: { id: input.revenueOrderId, vendorId: input.vendorId }, select: { campaign: { select: { placement: true } }, subscriptionBillingIntent: { select: { requestedById: true, amount: true, currency: true, expiresAt: true, merchantDestinationHash: true } }, vendor: { select: { ownerId: true } } } });
    if (!candidate) throw new Error("Revenue order not found.");
    if (candidate.subscriptionBillingIntent) {
      if (!input.actorUserId || input.actorUserId !== candidate.vendor.ownerId || candidate.subscriptionBillingIntent.requestedById !== candidate.vendor.ownerId) throw new Error("Only the shop owner can initiate subscription billing.");
      if (candidate.subscriptionBillingIntent.expiresAt <= new Date()) throw new Error("This subscription billing intent expired. Create a new billing request.");
      if (candidate.subscriptionBillingIntent.currency !== "UGX" || candidate.subscriptionBillingIntent.merchantDestinationHash !== VendorSubscriptionService.merchantDestinationHash()) throw new Error("The subscription merchant configuration changed. Create a new billing request.");
    }
    const prepare = async (tx: PromotionTransaction) => {
      if (candidate.campaign) await PromotionInventoryService.lock(tx, candidate.campaign.placement);
      const order = await tx.platformRevenueOrder.findFirst({ where: { id: input.revenueOrderId, vendorId: input.vendorId }, include: { campaign: { include: { reservation: true } }, paymentIntents: { orderBy: { createdAt: "desc" }, take: 1 } } });
      if (!order) throw new Error("Revenue order not found.");
      if (candidate.subscriptionBillingIntent && (Number(candidate.subscriptionBillingIntent.amount) !== Number(order.amountDue) || candidate.subscriptionBillingIntent.currency !== order.currency)) throw new Error("Subscription billing amount verification failed.");
      if (Number(order.amountDue) <= 0) throw new Error("This purchase is fully funded by promotional credit.");
      if (order.campaign && (!order.campaign.reservation || order.campaign.reservation.status !== "HOLD" || !order.campaign.reservation.holdExpiresAt || order.campaign.reservation.holdExpiresAt <= new Date())) throw new Error("The temporary advertising-slot hold expired. Review availability and create a new booking.");
      const existing = order.paymentIntents[0];
      if (existing?.status === "PENDING" || existing?.status === "CREATED") {
        if (existing.idempotencyKey === input.idempotencyKey) return { intent: existing, order, existing: true };
        throw new Error("A payment is already awaiting confirmation. Do not pay again.");
      }
      if (order.status !== "AWAITING_PAYMENT") throw new Error("This revenue order is not awaiting payment.");
      const reference = randomUUID();
      const intent = await tx.platformPaymentIntent.create({ data: { platformRevenueOrderId: order.id, vendorId: input.vendorId, provider: PaymentProvider.MTN_MOMO, amount: order.amountDue, currency: order.currency, status: "CREATED", providerReference: reference, idempotencyKey: input.idempotencyKey, merchantDestinationMasked: process.env.PLATFORM_MTN_MERCHANT_CODE ? `••••${process.env.PLATFORM_MTN_MERCHANT_CODE.slice(-4)}` : null } });
      return { intent, order, existing: false };
    };
    const prepared = candidate.campaign ? await PromotionInventoryService.runSerializable(prepare) : await prisma.$transaction(prepare);
    if (prepared.existing) return prepared.intent;
    const { intent, order } = prepared;
    const reference = intent.providerReference!;
    try {
      await (testProvider??new MtnMomoProvider(platformMtnEnvironment())).initiatePayment({ reference, amount: order.amountDue.toString(), currency: order.currency, payerPhone: input.payerPhone, merchantAccount: { merchantCode: process.env.PLATFORM_MTN_MERCHANT_CODE, merchantAccountId: process.env.PLATFORM_MTN_MERCHANT_ID } });
      return prisma.platformPaymentIntent.update({ where: { id: intent.id }, data: { status: "PENDING", nextReconcileAt: new Date(Date.now() + 120_000) } });
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "UNKNOWN";
      // Timeout, rate limit and upstream failures are deliberately uncertain.
      if (["SUBMISSION_UNKNOWN", "RATE_LIMITED", "PROVIDER_UNAVAILABLE", "PROVIDER_ERROR"].includes(code)) return prisma.platformPaymentIntent.update({ where: { id: intent.id }, data: { status: "PENDING", nextReconcileAt: new Date(Date.now() + 120_000), lastReconcileError: "Provider confirmation is pending." } });
      const reject = async (tx: PromotionTransaction) => {
        if (order.campaign) await PromotionInventoryService.lock(tx, order.campaign.placement);
        await tx.platformPaymentIntent.update({ where: { id: intent.id }, data: { status: "FAILED", lastReconcileError: "Payment request was rejected." } });
        await tx.platformRevenueOrder.update({ where: { id: order.id }, data: { status: "FAILED" } });
        if (order.campaign) {
          await PromotionInventoryService.release(tx, order.campaign.id);
          await tx.promotionCampaign.update({ where: { id: order.campaign.id }, data: { status: "PAYMENT_FAILED", fulfillmentStatus: "CANCELLED" } });
          if (Number(order.creditApplied) > 0) await tx.promotionCreditLedger.upsert({ where: { releaseKey: `promotion-credit-release:${order.campaign.id}` }, update: {}, create: { vendorId: order.vendorId, campaignId: order.campaign.id, type: "RELEASE", amount: order.creditApplied, releaseKey: `promotion-credit-release:${order.campaign.id}`, reason: "PAYMENT_NOT_FUNDED" } });
        }
      };
      if (order.campaign) await PromotionInventoryService.runSerializable(reject); else await prisma.$transaction(tx=>reject(tx));
      throw error;
    }
  }

  static isTerminal(status: PlatformPaymentIntentStatus) { return terminal.has(status); }
  static platformMtnEnvForReconciliation() { return platformMtnEnvironment(); }
}
