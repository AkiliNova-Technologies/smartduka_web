import { describe, expect, it, vi } from "vitest";

import { getPesapalConfig, PesapalConfigError, type PesapalConfig } from "@/lib/payments/pesapal/config";
import { paymentInitiationError } from "@/services/payments/pesapal-payment-service";
import { PesapalClient, PesapalClientError } from "@/services/payments/pesapal-client";

const config: PesapalConfig = {
  environment: "sandbox",
  baseUrl: "https://cybqa.pesapal.com/pesapalv3",
  consumerKey: "consumer-key",
  consumerSecret: "consumer-secret",
  ipnId: "e32182ca-0983-4fa0-91bc-c3bb813ba750",
  ipnUrl: "https://smartduka.test/api/webhooks/pesapal",
  callbackUrl: "https://smartduka.test/payment/callback",
};

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
});

describe("Pesapal configuration", () => {
  it("selects documented base URLs only from PESAPAL_ENV", () => {
    const shared = { PESAPAL_CONSUMER_KEY: "key", PESAPAL_CONSUMER_SECRET: "secret", PESAPAL_IPN_ID: config.ipnId, PESAPAL_IPN_URL: config.ipnUrl, PESAPAL_CALLBACK_URL: config.callbackUrl };
    expect(getPesapalConfig({ ...shared, PESAPAL_ENV: "sandbox" }).baseUrl).toBe(config.baseUrl);
    expect(getPesapalConfig({ ...shared, PESAPAL_ENV: "production" }).baseUrl).toBe("https://pay.pesapal.com/v3");
    expect(() => getPesapalConfig(shared)).toThrow(PesapalConfigError);
    expect(() => getPesapalConfig({ ...shared, PESAPAL_ENV: "sandbox", PESAPAL_IPN_URL: "http://localhost:3000/api/webhooks/pesapal" })).toThrow("PESAPAL_IPN_URL must use HTTPS.");
  });
});

describe("PesapalClient", () => {
  it("maps the merchant amount limit without exposing provider details to customers", () => {
    const error = paymentInitiationError(new PesapalClientError(
      "PESAPAL_PROVIDER_ERROR",
      "Pesapal reported a provider error.",
      200,
      { code: "amount_exceeds_default_limit", error_type: "contractual_error", message: "Transaction amount exceeds limit.Contact support for assistance" },
    ));
    expect(error).toMatchObject({
      code: "PESAPAL_AMOUNT_LIMIT",
      message: "This order exceeds the merchant's payment limit. Please contact support.",
    });
  });

  it("sends credentials only in authentication JSON and accepts a token", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ token: "token-a", expiryDate: "2030-01-01T00:00:00Z" }));
    const client = new PesapalClient({ getConfig: () => config, fetch });
    await expect(client.getAccessToken()).resolves.toBe("token-a");
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(`${config.baseUrl}/api/Auth/RequestToken`);
    expect(init.headers).not.toHaveProperty("Authorization");
    expect(JSON.parse(init.body)).toEqual({ consumer_key: config.consumerKey, consumer_secret: config.consumerSecret });
  });

  it("turns non-success, provider errors, and malformed responses into typed errors", async () => {
    const nonSuccess = new PesapalClient({ getConfig: () => config, fetch: vi.fn().mockResolvedValue(jsonResponse({}, 401)) });
    await expect(nonSuccess.getAccessToken()).rejects.toMatchObject({ code: "PESAPAL_AUTH_ERROR", status: 401 });
    const providerError = new PesapalClient({ getConfig: () => config, fetch: vi.fn().mockResolvedValue(jsonResponse({ error: { error_type: "validation", code: "INVALID_NOTIFICATION", message: "no" } })) });
    await expect(providerError.getAccessToken()).rejects.toMatchObject({ code: "PESAPAL_PROVIDER_ERROR", status: 200, providerError: { error_type: "validation", code: "INVALID_NOTIFICATION", message: "no" } });
    const malformed = new PesapalClient({ getConfig: () => config, fetch: vi.fn().mockResolvedValue(jsonResponse({ expiryDate: "2030-01-01T00:00:00Z" })) });
    await expect(malformed.getAccessToken()).rejects.toMatchObject({ code: "PESAPAL_INVALID_RESPONSE" });
  });

  it("converts an aborted request into a typed network timeout", async () => {
    const fetch = vi.fn((_: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))));
    const client = new PesapalClient({ getConfig: () => config, fetch, timeoutMs: 1 });
    await expect(client.getAccessToken()).rejects.toMatchObject({ code: "PESAPAL_NETWORK_ERROR" });
  });

  it("reuses cached tokens, refreshes inside the 60-second margin, and coalesces auth", async () => {
    let now = 0;
    let resolveFetch: ((response: Response) => void) | undefined;
    const fetch = vi.fn().mockImplementation(() => new Promise<Response>((resolve) => { resolveFetch = resolve; }));
    const client = new PesapalClient({ getConfig: () => config, fetch, now: () => now });
    const first = client.getAccessToken(); const concurrent = client.getAccessToken();
    expect(fetch).toHaveBeenCalledTimes(1);
    resolveFetch?.(jsonResponse({ token: "token-a", expiryDate: "1970-01-01T00:05:00Z" }));
    await expect(Promise.all([first, concurrent])).resolves.toEqual(["token-a", "token-a"]);
    await expect(client.getAccessToken()).resolves.toBe("token-a");
    now = 240_001;
    const refreshed = client.getAccessToken(); expect(fetch).toHaveBeenCalledTimes(2);
    resolveFetch?.(jsonResponse({ token: "token-b", expiryDate: "1970-01-01T00:10:00Z" }));
    await expect(refreshed).resolves.toBe("token-b");
  });

  it("gets bearer-authenticated IPNs and validates an exact active POST registration", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(jsonResponse({ token: "token-a", expiryDate: "2030-01-01T00:00:00Z" })).mockResolvedValueOnce(jsonResponse([{ ipn_id: config.ipnId, url: config.ipnUrl, ipn_status: 1, ipn_notification_type_description: "POST" }]));
    const client = new PesapalClient({ getConfig: () => config, fetch });
    await expect(client.validateConfiguredIpn()).resolves.toMatchObject({ ipn_id: config.ipnId });
    expect(fetch.mock.calls[1][0]).toBe(`${config.baseUrl}/api/URLSetup/GetIpnList`);
    expect(fetch.mock.calls[1][1].headers.Authorization).toBe("Bearer token-a");
  });

  it("rejects an inactive or non-POST configured IPN", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(jsonResponse({ token: "token-a", expiryDate: "2030-01-01T00:00:00Z" })).mockResolvedValue(jsonResponse([{ ipn_id: config.ipnId, url: config.ipnUrl, ipn_status: 0, ipn_notification_type_description: "GET" }]));
    const client = new PesapalClient({ getConfig: () => config, fetch });
    await expect(client.validateConfiguredIpn()).rejects.toMatchObject({ code: "PESAPAL_IPN_CONFIGURATION_ERROR" });
  });

  it("returns only validated transaction facts and rejects inconsistent status-code pairs", async () => {
    const goodFetch = vi.fn().mockResolvedValueOnce(jsonResponse({ token: "token-a", expiryDate: "2030-01-01T00:00:00Z" })).mockResolvedValueOnce(jsonResponse({ merchant_reference: "ref-1", amount: "17500.00", currency: "ugx", payment_status_description: "Completed", status_code: 1, confirmation_code: "code-1", payment_method: "MOBILE_MONEY" }));
    const good = new PesapalClient({ getConfig: () => config, fetch: goodFetch });
    await expect(good.getTransactionStatus("12345678-abcd")).resolves.toEqual({ merchantReference: "ref-1", amount: "17500.00", currency: "UGX", status: "COMPLETED", statusCode: 1, confirmationCode: "code-1", paymentMethod: "MOBILE_MONEY" });
    const badFetch = vi.fn().mockResolvedValueOnce(jsonResponse({ token: "token-a", expiryDate: "2030-01-01T00:00:00Z" })).mockResolvedValueOnce(jsonResponse({ merchant_reference: "ref-1", amount: 17500, currency: "UGX", payment_status_description: "Completed", status_code: 2 }));
    const bad = new PesapalClient({ getConfig: () => config, fetch: badFetch });
    await expect(bad.getTransactionStatus("12345678-abcd")).rejects.toMatchObject({ code: "PESAPAL_INVALID_RESPONSE" });
  });
});
