import { PaymentProvider } from "@prisma/client";
import { type InitiatePaymentInput, type InitiatePaymentResult, type PaymentProviderAdapter, type ProviderPaymentStatusResult, PaymentProviderUnavailableError } from "@/lib/payments/payment-provider";

export class MtnMomoConfigurationError extends Error { readonly code = "CONFIGURATION_ERROR"; }
export class MtnMomoProviderError extends Error { constructor(message: string, readonly code: string) { super(message); } }
export type MtnMomoConfig = { baseUrl: string; subscriptionKey: string; apiUser: string; apiKey: string; targetEnvironment: string; callbackUrl?: string; callbackHost?: string; environment: "sandbox" | "production"; directVendorRoutingVerified: boolean; sandboxTesting: boolean };

export function getMtnMomoConfig(env: NodeJS.ProcessEnv = process.env): MtnMomoConfig {
  const environment = env.MTN_MOMO_ENVIRONMENT;
  if (environment !== "sandbox" && environment !== "production") throw new MtnMomoConfigurationError("MTN_MOMO_ENVIRONMENT must be sandbox or production.");
  for (const key of ["MTN_MOMO_BASE_URL", "MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY", "MTN_MOMO_API_USER", "MTN_MOMO_API_KEY"] as const) if (!env[key]?.trim()) throw new MtnMomoConfigurationError(`${key} is required.`);
  const baseUrl = env.MTN_MOMO_BASE_URL!.replace(/\/$/, "");
  if (!/^https?:\/\//.test(baseUrl) || (environment === "production" && !baseUrl.startsWith("https://"))) throw new MtnMomoConfigurationError("MTN base URL must use HTTPS in production.");
  const callbackUrl = env.MTN_MOMO_CALLBACK_URL?.trim(), callbackHost = env.MTN_MOMO_CALLBACK_HOST?.trim();
  if (callbackUrl) { const parsed = new URL(callbackUrl); if (callbackHost && parsed.host !== callbackHost) throw new MtnMomoConfigurationError("MTN callback URL host does not match MTN_MOMO_CALLBACK_HOST."); if (environment === "production" && parsed.protocol !== "https:") throw new MtnMomoConfigurationError("MTN production callback URL must use HTTPS."); }
  const directVendorRoutingVerified = (env.MTN_MOMO_DIRECT_VENDOR_ROUTING_VERIFIED ?? env.MTN_DIRECT_VENDOR_ROUTING_VERIFIED) === "true";
  const sandboxTesting = environment === "sandbox" && env.MTN_SANDBOX_COLLECTION_TESTING_ENABLED === "true";
  return { baseUrl, subscriptionKey: env.MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY!, apiUser: env.MTN_MOMO_API_USER!, apiKey: env.MTN_MOMO_API_KEY!, targetEnvironment: env.MTN_MOMO_TARGET_ENVIRONMENT || environment, callbackUrl, callbackHost, environment, directVendorRoutingVerified, sandboxTesting };
}

let cached: { token: string; expiresAt: number } | undefined;
let refreshInFlight: Promise<string> | undefined;
const payerId = (value: string, sandbox: boolean) => { const compact = value.replace(/[\s()-]/g, ""); const normalized = compact.startsWith("+256") ? `256${compact.slice(4)}` : compact.startsWith("0") ? `256${compact.slice(1)}` : compact; if (sandbox && /^\d{6,18}$/.test(normalized)) return normalized; if (!/^2567\d{8}$/.test(normalized)) throw new MtnMomoProviderError("A valid Ugandan payer number is required.", "INVALID_REQUEST"); return normalized; };

export class MtnMomoProvider implements PaymentProviderAdapter {
  readonly provider = PaymentProvider.MTN_MOMO;
  constructor(private readonly env: NodeJS.ProcessEnv = process.env, private readonly request: typeof fetch = fetch) {}
  private async token(forceRefresh = false) {
    const config = getMtnMomoConfig(this.env);
    if (!forceRefresh && cached && cached.expiresAt > Date.now() + 30_000) return cached.token;
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = (async () => {
      let response: Response;
      try { response = await this.request(`${config.baseUrl}/collection/token/`, { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${config.apiUser}:${config.apiKey}`).toString("base64")}`, "Ocp-Apim-Subscription-Key": config.subscriptionKey }, signal: AbortSignal.timeout(10_000) }); }
      catch { throw new MtnMomoProviderError("MTN authentication is temporarily unavailable.", "PROVIDER_UNAVAILABLE"); }
      if (!response.ok) throw new MtnMomoProviderError("MTN authentication failed.", "AUTHENTICATION_FAILED");
      const body = await response.json().catch(() => null) as { access_token?: unknown; expires_in?: unknown } | null;
      if (!body || typeof body.access_token !== "string") throw new MtnMomoProviderError("MTN returned an invalid token response.", "INVALID_RESPONSE");
      cached = { token: body.access_token, expiresAt: Date.now() + (typeof body.expires_in === "number" ? body.expires_in : 300) * 1000 };
      return cached.token;
    })();
    try { return await refreshInFlight; } finally { refreshInFlight = undefined; }
  }
  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    const config = getMtnMomoConfig(this.env);
    if (config.environment !== "sandbox" || !config.sandboxTesting) throw new PaymentProviderUnavailableError(this.provider, "MTN production merchant destination routing is not implemented.");
    if (!input.payerPhone) throw new MtnMomoProviderError("A payer phone number is required.", "INVALID_REQUEST");
    const reference = input.reference, token = await this.token(), callbackEnabled = this.env.MTN_SANDBOX_TEST_USE_CALLBACK === "true";
    let response: Response;
    try { response = await this.request(`${config.baseUrl}/collection/v1_0/requesttopay`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "X-Reference-Id": reference, "X-Target-Environment": config.targetEnvironment, "Ocp-Apim-Subscription-Key": config.subscriptionKey, "Content-Type": "application/json", ...(callbackEnabled && config.callbackUrl ? { "X-Callback-Url": config.callbackUrl } : {}) }, body: JSON.stringify({ amount: input.amount, currency: this.env.MTN_SANDBOX_TEST_CURRENCY || input.currency, externalId: reference, payer: { partyIdType: "MSISDN", partyId: payerId(input.payerPhone, true) }, payerMessage: "SmartDuka sandbox payment", payeeNote: "SmartDuka sandbox payment" }), signal: AbortSignal.timeout(12_000) }); }
    catch { throw new MtnMomoProviderError("MTN payment submission outcome is unknown; do not retry automatically.", "SUBMISSION_UNKNOWN"); }
    if (response.status !== 202) throw new MtnMomoProviderError(response.status === 429 ? "MTN is rate limiting requests." : "MTN rejected the payment request.", response.status === 429 ? "RATE_LIMITED" : "REQUEST_REJECTED");
    return { providerReference: reference, status: "PENDING", instructions: "Approve the sandbox request on your MTN Mobile Money phone." };
  }
  private async statusRequest(config: MtnMomoConfig, reference: string, token: string) { try { return await this.request(`${config.baseUrl}/collection/v1_0/requesttopay/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${token}`, "X-Target-Environment": config.targetEnvironment, "Ocp-Apim-Subscription-Key": config.subscriptionKey }, signal: AbortSignal.timeout(10_000) }); } catch { throw new MtnMomoProviderError("MTN status lookup is temporarily unavailable.", "PROVIDER_UNAVAILABLE"); } }
  async getPaymentStatus(reference: string): Promise<ProviderPaymentStatusResult> {
    const config = getMtnMomoConfig(this.env); let response = await this.statusRequest(config, reference, await this.token());
    if (response.status === 401) { cached = undefined; response = await this.statusRequest(config, reference, await this.token(true)); }
    if (!response.ok) throw new MtnMomoProviderError("MTN status lookup failed.", response.status === 404 ? "NOT_FOUND" : response.status === 429 ? "RATE_LIMITED" : "PROVIDER_ERROR");
    const body = await response.json().catch(() => null) as { status?: unknown; amount?: unknown; currency?: unknown; financialTransactionId?: unknown } | null;
    const statuses: Record<string, ProviderPaymentStatusResult["status"]> = { PENDING: "PENDING", SUCCESSFUL: "SUCCESSFUL", FAILED: "FAILED" };
    if (!body || typeof body.status !== "string" || typeof body.amount !== "string" || typeof body.currency !== "string" || !statuses[body.status]) throw new MtnMomoProviderError("MTN returned an unsupported payment status.", "INVALID_RESPONSE");
    return { providerReference: reference, status: statuses[body.status], amount: body.amount, currency: body.currency, providerTransactionId: typeof body.financialTransactionId === "string" ? body.financialTransactionId : undefined };
  }
  static resetTokenCacheForTests() { cached = undefined; refreshInFlight = undefined; }
}
