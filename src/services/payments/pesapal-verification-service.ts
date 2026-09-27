import { PaymentAttemptStatus, PaymentStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/client";
import { prisma } from "@/lib/prisma/client";
import { PesapalClient, type PesapalClientError } from "./pesapal-client";
import { MarketplaceEconomicsService } from "@/services/marketplace-economics";
import { ReturnsRefundsService } from "@/services/returns-refunds";

export type PesapalVerificationSource = "CALLBACK" | "IPN" | "RECONCILIATION";
export type PesapalVerificationOutcome =
  | "COMPLETED"
  | "FAILED"
  | "REVERSED"
  | "IDEMPOTENT"
  | "UNMATCHED"
  | "MISMATCH"
  | "STALE";

type Attempt = {
  id: string;
  orderId: string;
  merchantReference: string;
  providerTrackingId: string | null;
  amount: Decimal;
  currency: string;
  status: PaymentAttemptStatus;
  orderCompletedAt: Date | null;
};

const candidateSelect = {
  id: true,
  orderId: true,
  merchantReference: true,
  providerTrackingId: true,
  amount: true,
  currency: true,
  status: true,
  orderCompletedAt: true,
} as const;

function safeProviderPayload(status: {
  merchantReference: string;
  amount: string;
  currency: string;
  status: string;
  statusCode: number;
  confirmationCode?: string;
  paymentMethod?: string;
}) {
  return {
    merchantReference: status.merchantReference,
    amount: status.amount,
    currency: status.currency,
    status: status.status,
    statusCode: status.statusCode,
    ...(status.confirmationCode ? { confirmationCode: status.confirmationCode } : {}),
    ...(status.paymentMethod ? { paymentMethod: status.paymentMethod } : {}),
  };
}

function providerMetadata(status: Awaited<ReturnType<PesapalClient["getTransactionStatus"]>>) {
  return {
    providerStatus: status.status,
    confirmationCode: status.confirmationCode ?? null,
    paymentMethod: status.paymentMethod ?? null,
    providerPayload: safeProviderPayload(status),
  };
}

function transitionData(status: Awaited<ReturnType<PesapalClient["getTransactionStatus"]>>, now: Date) {
  return { ...providerMetadata(status), verifiedAt: now, lastVerifiedAt: now };
}

/**
 * The only business-level Pesapal reconciliation boundary. Notification input merely
 * identifies a local candidate; payment facts always come from GetTransactionStatus.
 */
export class PesapalVerificationService {
  constructor(
    private readonly client = new PesapalClient(),
    private readonly database = prisma,
  ) {}

  async verifyPesapalTransaction(input: {
    orderTrackingId: string;
    claimedMerchantReference?: string;
    source: PesapalVerificationSource;
  }): Promise<{ outcome: PesapalVerificationOutcome; attemptId?: string; recoveredTrackingId?: boolean }> {
    const orderTrackingId = input.orderTrackingId.trim();
    const claimedMerchantReference = input.claimedMerchantReference?.trim() || undefined;
    if (!orderTrackingId) return { outcome: "UNMATCHED" };

    let attempt = await this.database.paymentAttempt.findUnique({
      where: { providerTrackingId: orderTrackingId }, select: candidateSelect,
    }) as Attempt | null;
    const recovering = !attempt;
    if (!attempt && claimedMerchantReference) {
      attempt = await this.database.paymentAttempt.findUnique({
        where: { merchantReference: claimedMerchantReference }, select: candidateSelect,
      }) as Attempt | null;
    }
    if (!attempt) return { outcome: "UNMATCHED" };
    if (claimedMerchantReference && claimedMerchantReference !== attempt.merchantReference) {
      return { outcome: "MISMATCH", attemptId: attempt.id };
    }

    const provider = await this.client.getTransactionStatus(orderTrackingId);
    if (
      provider.merchantReference !== attempt.merchantReference ||
      (claimedMerchantReference && provider.merchantReference !== claimedMerchantReference) ||
      provider.currency.trim().toUpperCase() !== attempt.currency.trim().toUpperCase()
    ) return { outcome: "MISMATCH", attemptId: attempt.id };

    let providerAmount: Decimal;
    try { providerAmount = new Decimal(provider.amount); } catch { return { outcome: "MISMATCH", attemptId: attempt.id }; }
    if (!providerAmount.isFinite() || !providerAmount.equals(new Decimal(attempt.amount.toString()))) {
      return { outcome: "MISMATCH", attemptId: attempt.id };
    }

    const now = new Date();
    const result = await this.database.$transaction(async (tx) => {
      const common = transitionData(provider, now);
      const recovery = recovering ? { providerTrackingId: orderTrackingId } : {};
      const pendingStatuses = [PaymentAttemptStatus.INITIATED, PaymentAttemptStatus.SUBMISSION_UNKNOWN];

      if (provider.status === "COMPLETED") {
        const stateUpdate = await tx.paymentAttempt.updateMany({
          where: { id: attempt.id, status: { in: pendingStatuses } },
          data: { ...common, ...recovery, status: PaymentAttemptStatus.COMPLETED, completedAt: now },
        });
        if (stateUpdate.count === 1) {
          // This conditional update elects exactly one concurrently verified attempt.
          const orderWinner = await tx.order.updateMany({
            where: { id: attempt.orderId, paymentStatus: PaymentStatus.PENDING },
            data: { paymentStatus: PaymentStatus.COMPLETED },
          });
          if (orderWinner.count === 1) {
            await tx.paymentAttempt.updateMany({ where: { id: attempt.id, status: PaymentAttemptStatus.COMPLETED, orderCompletedAt: null }, data: { orderCompletedAt: now } });
          }
          return { outcome: "COMPLETED" as const };
        }
        if (attempt.status === PaymentAttemptStatus.COMPLETED) {
          await tx.paymentAttempt.updateMany({ where: { id: attempt.id, status: PaymentAttemptStatus.COMPLETED }, data: { ...providerMetadata(provider), ...recovery, lastVerifiedAt: now } });
          return { outcome: "IDEMPOTENT" as const };
        }
        return { outcome: "STALE" as const };
      }

      if (provider.status === "REVERSED") {
        const stateUpdate = await tx.paymentAttempt.updateMany({
          where: { id: attempt.id, status: { in: [...pendingStatuses, PaymentAttemptStatus.COMPLETED] } },
          data: { ...common, ...recovery, status: PaymentAttemptStatus.REVERSED, reversedAt: now },
        });
        if (stateUpdate.count === 0) {
          if (attempt.status === PaymentAttemptStatus.REVERSED) {
            await tx.paymentAttempt.updateMany({ where: { id: attempt.id, status: PaymentAttemptStatus.REVERSED }, data: { ...providerMetadata(provider), ...recovery, lastVerifiedAt: now } });
            return { outcome: "IDEMPOTENT" as const };
          }
          return { outcome: "STALE" as const };
        }
        // Only the attempt which conditionally won order completion may reverse it.
        if (attempt.status === PaymentAttemptStatus.COMPLETED && attempt.orderCompletedAt) {
          await tx.order.updateMany({
            where: { id: attempt.orderId, paymentStatus: PaymentStatus.COMPLETED },
            data: { paymentStatus: PaymentStatus.REVERSED },
          });
        }
        return { outcome: "REVERSED" as const };
      }

      // Pesapal INVALID is represented by the existing FAILED attempt enum.
      const stateUpdate = await tx.paymentAttempt.updateMany({
        where: { id: attempt.id, status: { in: pendingStatuses } },
        data: { ...common, ...recovery, status: PaymentAttemptStatus.FAILED },
      });
      if (stateUpdate.count === 1) return { outcome: "FAILED" as const };
      if (attempt.status === PaymentAttemptStatus.FAILED) {
        await tx.paymentAttempt.updateMany({ where: { id: attempt.id, status: PaymentAttemptStatus.FAILED }, data: { ...providerMetadata(provider), ...recovery, lastVerifiedAt: now } });
        return { outcome: "IDEMPOTENT" as const };
      }
      return { outcome: "STALE" as const };
    });

    if (result.outcome === "REVERSED") {
      try { await ReturnsRefundsService.reversePaymentEarnings(attempt.id); } catch { /* reconciliation can safely retry immutable reversal entries */ }
    }
    if (result.outcome === "COMPLETED" || result.outcome === "IDEMPOTENT") {
      try { await MarketplaceEconomicsService.allocatePaidOrderEconomics(attempt.orderId, attempt.id); } catch { /* paid order remains authoritative; reconciliation can retry allocation */ }
    }
    return { ...result, attemptId: attempt.id, ...(recovering ? { recoveredTrackingId: true } : {}) };
  }
}

export function isTransientPesapalError(error: unknown) {
  const code = (error as PesapalClientError | undefined)?.code;
  return code === "PESAPAL_NETWORK_ERROR" || code === "PESAPAL_AUTH_ERROR" || code === "PESAPAL_PROVIDER_ERROR" || code === "PESAPAL_INVALID_RESPONSE";
}
