import { PaymentProvider } from "@prisma/client";

export type InitiatePaymentInput = {
  reference: string;
  amount: string;
  currency: string;
  merchantAccount: { merchantCode?: string | null; merchantAccountId?: string | null; merchantPhone?: string | null };
  payerPhone?: string;
};
export type InitiatePaymentResult = { providerReference: string; status: "PENDING"; instructions?: string };
export type ProviderPaymentStatusResult = { providerReference: string; status: "PENDING" | "SUCCESSFUL" | "FAILED" | "REVERSED"; amount: string; currency: string; providerTransactionId?: string };

export interface PaymentProviderAdapter {
  readonly provider: PaymentProvider;
  initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult>;
  getPaymentStatus(reference: string): Promise<ProviderPaymentStatusResult>;
  /** Must validate authenticity before a callback is mapped or persisted. */
  validateCallback?(request: Request): Promise<unknown>;
}

/** One configuration boundary for all customer-payment provider availability. */
export class PaymentProviderRegistry {
  static isEnabled(provider: PaymentProvider, environment: NodeJS.ProcessEnv = process.env) {
    const key: Record<PaymentProvider, string> = {
      MTN_MOMO: "PAYMENTS_MTN_ENABLED",
      AIRTEL_MONEY: "PAYMENTS_AIRTEL_ENABLED",
      PESAPAL: "PAYMENTS_PESAPAL_ENABLED",
    };
    const legacy = provider === "MTN_MOMO" ? environment.MTN_MOMO_ENABLED : provider === "AIRTEL_MONEY" ? environment.AIRTEL_MONEY_ENABLED : undefined;
    return (environment[key[provider]] ?? legacy)?.trim().toLowerCase() === "true";
  }

  static assertEnabled(provider: PaymentProvider) {
    if (!this.isEnabled(provider)) throw new PaymentProviderUnavailableError(provider);
  }
  static getReadiness(provider: PaymentProvider, environment: NodeJS.ProcessEnv = process.env) {
    const prefix = provider === "MTN_MOMO" ? "MTN_MOMO" : provider === "AIRTEL_MONEY" ? "AIRTEL_MONEY" : "PESAPAL";
    const enabled = this.isEnabled(provider, environment);
    const directVendorRoutingVerified = (environment[`${prefix}_DIRECT_VENDOR_ROUTING_VERIFIED`] ?? (provider === "MTN_MOMO" ? environment.MTN_DIRECT_VENDOR_ROUTING_VERIFIED : undefined))?.toLowerCase() === "true";
    const environmentName = environment[`${prefix}_ENVIRONMENT`]?.toLowerCase() || "unconfigured";
    const configured = provider === "MTN_MOMO"
      ? Boolean(environment.MTN_MOMO_BASE_URL && environment.MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY && environment.MTN_MOMO_API_USER && environment.MTN_MOMO_API_KEY)
      : provider === "AIRTEL_MONEY"
        ? Boolean(environment.AIRTEL_MONEY_BASE_URL && environment.AIRTEL_MONEY_CLIENT_ID && environment.AIRTEL_MONEY_CLIENT_SECRET)
        : false;
    const sandboxTechnicalTesting = provider === "MTN_MOMO" && environmentName === "sandbox" && environment.MTN_SANDBOX_COLLECTION_TESTING_ENABLED?.toLowerCase() === "true";
    // Customer-facing payments always require proven direct vendor routing.
    // Sandbox Collection credentials are deliberately insufficient here.
    return { provider, enabled, environment: environmentName, configured, directVendorRoutingVerified, sandboxTechnicalTesting, customerPaymentsReady: enabled && configured && directVendorRoutingVerified };
  }
  static assertCustomerPaymentsReady(provider: PaymentProvider) {
    const readiness = this.getReadiness(provider);
    if (!readiness.enabled) throw new PaymentProviderUnavailableError(provider);
    if (!readiness.configured) throw new PaymentProviderUnavailableError(provider);
    if (!readiness.directVendorRoutingVerified) throw new PaymentProviderUnavailableError(provider, "Direct vendor routing has not been verified for this provider.");
  }
  /**
   * A deliberately narrow capability for the trusted reconciliation CLI. It
   * cannot be reached by customer routes and never applies in production.
   */
  static isSandboxQualificationReady(provider: PaymentProvider, environment: NodeJS.ProcessEnv = process.env) {
    const readiness = this.getReadiness(provider, environment);
    return provider === PaymentProvider.MTN_MOMO
      && readiness.environment === "sandbox"
      && readiness.configured
      && readiness.sandboxTechnicalTesting
      && !readiness.directVendorRoutingVerified;
  }
}

export class PaymentProviderUnavailableError extends Error {
  readonly code = "PAYMENT_PROVIDER_UNAVAILABLE";
  constructor(readonly provider: PaymentProvider, message?: string) {
    super(message ?? `${provider.replaceAll("_", " ")} is not available for new payments.`);
  }
}
