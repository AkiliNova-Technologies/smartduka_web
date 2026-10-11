import { PaymentProvider } from "@prisma/client";
import type { InitiatePaymentInput, InitiatePaymentResult, PaymentProviderAdapter, ProviderPaymentStatusResult } from "@/lib/payments/payment-provider";

export type FakeMtnOutcome = "SUCCESSFUL" | "FAILED" | "PENDING" | "CUSTOMER_REJECTED" | "INSUFFICIENT_FUNDS" | "INVALID_PAYER" | "REQUEST_TIMEOUT" | "STATUS_TIMEOUT" | "HTTP_404" | "HTTP_429" | "HTTP_500" | "TOKEN_EXPIRED" | "REVERSED" | "DUPLICATE_EVENT";

/** Test-only deterministic adapter. It is deliberately not exported by app code. */
export class FakeMtnProvider implements PaymentProviderAdapter {
  readonly provider = PaymentProvider.MTN_MOMO;
  readonly initiated: string[] = [];
  private readonly statuses = new Map<string, FakeMtnOutcome[]>();
  constructor(private readonly initiation: FakeMtnOutcome = "PENDING", sequences: Record<string, FakeMtnOutcome[]> = {}) {
    if (process.env.NODE_ENV === "production") throw new Error("Fake MTN provider is forbidden in production.");
    for (const [reference, outcomes] of Object.entries(sequences)) this.statuses.set(reference, [...outcomes]);
  }
  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    this.initiated.push(input.reference);
    if (this.initiation === "REQUEST_TIMEOUT") throw Object.assign(new Error("Simulated RequestToPay timeout."), { code: "SUBMISSION_UNKNOWN" });
    if (["HTTP_429", "HTTP_500"].includes(this.initiation)) throw Object.assign(new Error("Simulated RequestToPay rejection."), { code: this.initiation === "HTTP_429" ? "RATE_LIMITED" : "REQUEST_REJECTED" });
    this.statuses.set(input.reference, this.statuses.get(input.reference) ?? [this.initiation]);
    return { providerReference: input.reference, status: "PENDING" };
  }
  async getPaymentStatus(reference: string): Promise<ProviderPaymentStatusResult> {
    const sequence = this.statuses.get(reference);
    const outcome = sequence?.length ? sequence.shift()! : "PENDING";
    if (sequence?.length === 0) this.statuses.set(reference, [outcome]);
    if (["STATUS_TIMEOUT", "HTTP_500"].includes(outcome)) throw Object.assign(new Error("Simulated MTN status outage."), { code: "PROVIDER_UNAVAILABLE" });
    if (outcome === "HTTP_404") throw Object.assign(new Error("Simulated MTN status not found."), { code: "NOT_FOUND" });
    if (outcome === "HTTP_429") throw Object.assign(new Error("Simulated MTN rate limit."), { code: "RATE_LIMITED" });
    if (outcome === "TOKEN_EXPIRED") throw Object.assign(new Error("Simulated expired token."), { code: "AUTHENTICATION_FAILED" });
    const status = outcome === "SUCCESSFUL" || outcome === "DUPLICATE_EVENT" ? "SUCCESSFUL" : outcome === "REVERSED" ? "REVERSED" : outcome === "PENDING" ? "PENDING" : "FAILED";
    return { providerReference: reference, status, amount: "100.00", currency: "EUR", providerTransactionId: outcome === "DUPLICATE_EVENT" ? "duplicate-event" : `fake-${reference}` };
  }
}
