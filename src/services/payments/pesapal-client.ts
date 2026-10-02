import { getPesapalConfig, type PesapalConfig } from "@/lib/payments/pesapal/config";

const REQUEST_TIMEOUT_MS = 10_000;
const TOKEN_MAX_LIFETIME_MS = 5 * 60_000;
const TOKEN_REFRESH_MARGIN_MS = 60_000;

type FetchFunction = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export type PesapalErrorCode =
  | "PESAPAL_AUTH_ERROR"
  | "PESAPAL_NETWORK_ERROR"
  | "PESAPAL_PROVIDER_ERROR"
  | "PESAPAL_INVALID_RESPONSE"
  | "PESAPAL_IPN_CONFIGURATION_ERROR";

export class PesapalClientError extends Error {
  constructor(
    readonly code: PesapalErrorCode,
    message: string,
    readonly status?: number,
    readonly providerError?: PesapalProviderError,
  ) {
    super(message);
    this.name = "PesapalClientError";
  }
}

export interface PesapalProviderError {
  type?: string;
  error_type?: string;
  code?: string | number;
  message?: string;
}

export interface PesapalTokenResponse {
  token: string;
  expiryDate: string;
  error?: PesapalProviderError | null;
  status?: string;
  message?: string;
}

export interface PesapalIpnRecord {
  url: string;
  created_date?: string;
  ipn_id: string;
  notification_type?: number;
  ipn_notification_type_description?: string;
  ipn_status?: number | boolean | string;
  ipn_status_description?: string;
  error?: PesapalProviderError | null;
  status?: string;
}

export type PesapalRegisterIpnResponse = PesapalIpnRecord;

/** Typed contracts reserved for the later payment-initiation and verification phases. */
export interface PesapalSubmitOrderResponse {
  order_tracking_id: string;
  merchant_reference: string;
  redirect_url: string;
  error?: PesapalProviderError | null;
  status?: string;
}

export interface PesapalTransactionStatusResponse {
  payment_method?: string;
  amount?: number | string;
  confirmation_code?: string;
  payment_status_description?: string;
  merchant_reference?: string;
  currency?: string;
  status_code?: number;
  error?: PesapalProviderError | null;
  status?: string;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

interface PesapalClientOptions {
  getConfig?: () => PesapalConfig;
  fetch?: FetchFunction;
  now?: () => number;
  timeoutMs?: number;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function providerError(value: unknown): PesapalProviderError | undefined {
  if (!isObject(value)) return undefined;
  const nestedError = isObject(value.error) ? value.error : undefined;
  const candidate = nestedError ?? value;
  const message = typeof candidate.message === "string" ? candidate.message : undefined;
  const code = typeof candidate.code === "string" || typeof candidate.code === "number" ? candidate.code : undefined;
  const type = typeof candidate.type === "string" ? candidate.type : undefined;
  const errorType = typeof candidate.error_type === "string" ? candidate.error_type : undefined;
  if (!nestedError && code === undefined && !type && !errorType) return undefined;
  return message || code !== undefined || type || errorType
    ? { ...(message ? { message } : {}), ...(code !== undefined ? { code } : {}), ...(type ? { type } : {}), ...(errorType ? { error_type: errorType } : {}) }
    : undefined;
}

function activePostIpn(ipn: PesapalIpnRecord): boolean {
  const active = ipn.ipn_status === 1 || ipn.ipn_status === true || ipn.ipn_status === "1";
  return active && ipn.ipn_notification_type_description?.toUpperCase() === "POST";
}

export class PesapalClient {
  private cachedToken?: CachedToken;
  private tokenRequest?: Promise<string>;
  private readonly getConfig: () => PesapalConfig;
  private readonly fetch: FetchFunction;
  private readonly now: () => number;
  private readonly timeoutMs: number;

  constructor(options: PesapalClientOptions = {}) {
    this.getConfig = options.getConfig ?? getPesapalConfig;
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.now = options.now ?? Date.now;
    this.timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
  }

  async requestAccessToken(): Promise<string> {
    const config = this.getConfig();
    const response = await this.requestJson(
      "/api/Auth/RequestToken",
      {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ consumer_key: config.consumerKey, consumer_secret: config.consumerSecret }),
      },
      "PESAPAL_AUTH_ERROR",
    );

    if (providerError(response)) {
      throw new PesapalClientError("PESAPAL_PROVIDER_ERROR", "Pesapal rejected the authentication request.", undefined, providerError(response));
    }
    if (!isObject(response) || typeof response.token !== "string" || !response.token.trim()) {
      throw new PesapalClientError("PESAPAL_INVALID_RESPONSE", "Pesapal token response did not include a token.");
    }

    const providerExpiry = typeof response.expiryDate === "string" ? Date.parse(response.expiryDate) : Number.NaN;
    const safeExpiry = this.now() + TOKEN_MAX_LIFETIME_MS;
    this.cachedToken = {
      token: response.token,
      expiresAt: Number.isFinite(providerExpiry) ? Math.min(providerExpiry, safeExpiry) : safeExpiry,
    };
    return response.token;
  }

  async getAccessToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt - this.now() > TOKEN_REFRESH_MARGIN_MS) {
      return this.cachedToken.token;
    }
    if (!this.tokenRequest) {
      this.tokenRequest = this.requestAccessToken().finally(() => {
        this.tokenRequest = undefined;
      });
    }
    return this.tokenRequest;
  }


  async getRegisteredIpns(): Promise<PesapalIpnRecord[]> {
    const token = await this.getAccessToken();
    const response = await this.requestJson("/api/URLSetup/GetIpnList", { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } });
    if (!Array.isArray(response) || !response.every((item) => isObject(item) && typeof item.ipn_id === "string" && typeof item.url === "string")) throw new PesapalClientError("PESAPAL_INVALID_RESPONSE", "Pesapal IPN list response was invalid.");
    return response as PesapalIpnRecord[];
  }

  async submitOrder(request: { id: string; currency: string; amount: number; description: string; callback_url: string; cancellation_url?: string; notification_id: string; billing_address: Record<string, string> }): Promise<{ orderTrackingId: string; merchantReference: string; redirectUrl: string }> {
    const token = await this.getAccessToken();
    const response = await this.requestJson(PESAPAL_ENDPOINTS.submitOrder, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(request) });
    if (!isObject(response) || typeof response.order_tracking_id !== "string" || !response.order_tracking_id.trim() || typeof response.merchant_reference !== "string" || !response.merchant_reference.trim() || typeof response.redirect_url !== "string") throw new PesapalClientError("PESAPAL_INVALID_RESPONSE", "Pesapal submit response was invalid.");
    let redirectUrl: URL; try { redirectUrl = new URL(response.redirect_url); } catch { throw new PesapalClientError("PESAPAL_INVALID_RESPONSE", "Pesapal redirect URL was invalid."); }
    if (redirectUrl.protocol !== "https:") throw new PesapalClientError("PESAPAL_INVALID_RESPONSE", "Pesapal redirect URL must use HTTPS.");
    return { orderTrackingId: response.order_tracking_id, merchantReference: response.merchant_reference, redirectUrl: redirectUrl.toString() };
  }

  /** Explicit administrative operation only; no runtime code invokes it automatically. */
  async registerIpn(): Promise<PesapalRegisterIpnResponse> {

    const config = this.getConfig();
    const token = await this.getAccessToken();
    const response = await this.requestJson("/api/URLSetup/RegisterIPN", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ url: config.ipnUrl, ipn_notification_type: "POST" }),
    });
    if (!isObject(response) || typeof response.ipn_id !== "string" || typeof response.url !== "string") {
      throw new PesapalClientError("PESAPAL_INVALID_RESPONSE", "Pesapal IPN registration response was invalid.");
    }
    return response as unknown as PesapalRegisterIpnResponse;
  }

  async validateConfiguredIpn(): Promise<PesapalIpnRecord> {
    const config = this.getConfig();
    const configuredUrl = new URL(config.ipnUrl).toString();
    const record = (await this.getRegisteredIpns()).find((ipn) => ipn.ipn_id === config.ipnId);
    if (!record || new URL(record.url).toString() !== configuredUrl || !activePostIpn(record)) {
      throw new PesapalClientError(
        "PESAPAL_IPN_CONFIGURATION_ERROR",
        "The configured Pesapal IPN must be registered, active, URL-matched, and use POST.",

      );
    }
    return record;
  }


  async getTransactionStatus(orderTrackingId: string): Promise<{ merchantReference: string; amount: string; currency: string; status: "INVALID" | "COMPLETED" | "FAILED" | "REVERSED"; statusCode: 0 | 1 | 2 | 3; confirmationCode?: string; paymentMethod?: string }> {
    if (!/^[A-Za-z0-9-]{8,191}$/.test(orderTrackingId)) throw new PesapalClientError("PESAPAL_INVALID_RESPONSE", "Pesapal tracking ID was invalid.");
    const token = await this.getAccessToken();
    const response = await this.requestJson(`${PESAPAL_ENDPOINTS.getTransactionStatus}?orderTrackingId=${encodeURIComponent(orderTrackingId)}`, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } });
    if (!isObject(response) || typeof response.merchant_reference !== "string" || typeof response.currency !== "string" || (typeof response.amount !== "number" && typeof response.amount !== "string") || typeof response.payment_status_description !== "string" || typeof response.status_code !== "number") throw new PesapalClientError("PESAPAL_INVALID_RESPONSE", "Pesapal transaction status response was invalid.");
    const status = response.payment_status_description.toUpperCase(); const expected: Record<string, number> = { INVALID: 0, COMPLETED: 1, FAILED: 2, REVERSED: 3 };
    if (!(status in expected) || expected[status] !== response.status_code) throw new PesapalClientError("PESAPAL_INVALID_RESPONSE", "Pesapal transaction status was inconsistent.");
    return { merchantReference: response.merchant_reference, amount: String(response.amount), currency: response.currency.trim().toUpperCase(), status: status as "INVALID" | "COMPLETED" | "FAILED" | "REVERSED", statusCode: response.status_code as 0 | 1 | 2 | 3, ...(typeof response.confirmation_code === "string" ? { confirmationCode: response.confirmation_code } : {}), ...(typeof response.payment_method === "string" ? { paymentMethod: response.payment_method } : {}) };
  }
  private async requestJson(path: string, init: RequestInit, errorCode: PesapalErrorCode = "PESAPAL_PROVIDER_ERROR"): Promise<unknown> {
    const config = this.getConfig();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;
    try {
      response = await this.fetch(`${config.baseUrl}${path}`, { ...init, signal: controller.signal });
    } catch (error) {

      const timeoutError = error instanceof DOMException && error.name === "AbortError";
      throw new PesapalClientError("PESAPAL_NETWORK_ERROR", timeoutError ? "Pesapal request timed out." : "Pesapal network request failed.");
    } finally {
      clearTimeout(timeout);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new PesapalClientError("PESAPAL_INVALID_RESPONSE", "Pesapal returned invalid JSON.", response.status);
    }
    if (!response.ok) {
      throw new PesapalClientError(errorCode, "Pesapal returned an unsuccessful response.", response.status, providerError(body));
    }
    const diagnostic = providerError(body);
    if (diagnostic) {
      throw new PesapalClientError("PESAPAL_PROVIDER_ERROR", "Pesapal reported a provider error.", response.status, diagnostic);
    }
    return body;
  }
}

export const PESAPAL_ENDPOINTS = {
  requestToken: "/api/Auth/RequestToken",
  registerIpn: "/api/URLSetup/RegisterIPN",
  getIpnList: "/api/URLSetup/GetIpnList",
  submitOrder: "/api/Transactions/SubmitOrderRequest",
  getTransactionStatus: "/api/Transactions/GetTransactionStatus",
} as const;
