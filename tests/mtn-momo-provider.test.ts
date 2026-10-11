import { beforeEach, describe, expect, it, vi } from "vitest";
import { MtnMomoProvider } from "@/lib/payments/providers/mtn-momo-provider";

const environment = {
  NODE_ENV: "test",
  MTN_MOMO_ENVIRONMENT: "sandbox",
  MTN_MOMO_BASE_URL: "https://sandbox.example.test",
  MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY: "subscription-key",
  MTN_MOMO_API_USER: "api-user",
  MTN_MOMO_API_KEY: "api-key",
  MTN_MOMO_TARGET_ENVIRONMENT: "sandbox",
  MTN_SANDBOX_COLLECTION_TESTING_ENABLED: "true",
  MTN_SANDBOX_TEST_CURRENCY: "EUR",
} as NodeJS.ProcessEnv;

describe("MtnMomoProvider", () => {
  beforeEach(() => MtnMomoProvider.resetTokenCacheForTests());

  it("uses POST for OAuth before submitting the sandbox request", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "test-token", expires_in: 300 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 202 }));
    const provider = new MtnMomoProvider(environment, request);
    await expect(provider.initiatePayment({ reference: "00000000-0000-4000-8000-000000000001", amount: "100.00", currency: "EUR", payerPhone: "1234567890", merchantAccount: {} })).resolves.toMatchObject({ status: "PENDING" });
    expect(request.mock.calls[0][0]).toBe("https://sandbox.example.test/collection/token/");
    expect(request.mock.calls[0][1]).toMatchObject({ method: "POST" });
    expect(request.mock.calls[1][0]).toBe("https://sandbox.example.test/collection/v1_0/requesttopay");
  });

  it("sends the documented callback header only when sandbox callback qualification is enabled", async () => {
    const request = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "test-token" }), { status: 200 })).mockResolvedValueOnce(new Response(null, { status: 202 }));
    const enabled = { ...environment, MTN_MOMO_CALLBACK_URL: "https://callback.example.test/api/payments/callbacks/mtn", MTN_SANDBOX_TEST_USE_CALLBACK: "true" };
    await new MtnMomoProvider(enabled, request).initiatePayment({ reference: "00000000-0000-4000-8000-000000000002", amount: "100.00", currency: "EUR", payerPhone: "1234567890", merchantAccount: {} });
    expect(request.mock.calls[1][1].headers).toMatchObject({ "X-Callback-Url": enabled.MTN_MOMO_CALLBACK_URL });
    MtnMomoProvider.resetTokenCacheForTests();
    const disabledRequest = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "test-token" }), { status: 200 })).mockResolvedValueOnce(new Response(null, { status: 202 }));
    await new MtnMomoProvider({ ...enabled, MTN_SANDBOX_TEST_USE_CALLBACK: "false" }, disabledRequest).initiatePayment({ reference: "00000000-0000-4000-8000-000000000003", amount: "100.00", currency: "EUR", payerPhone: "1234567890", merchantAccount: {} });
    expect(disabledRequest.mock.calls[1][1].headers).not.toHaveProperty("X-Callback-Url");
  });

  it("refreshes an expired token once and retries a status lookup", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "expired", expires_in: 300 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "fresh", expires_in: 300 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "SUCCESSFUL", amount: "100", currency: "EUR" }), { status: 200 }));
    await expect(new MtnMomoProvider(environment, request).getPaymentStatus("ref-a")).resolves.toMatchObject({ status: "SUCCESSFUL" });
    expect(request.mock.calls.filter(([url]) => String(url).endsWith("/collection/token/")).length).toBe(2);
  });

  it("uses a single in-flight OAuth refresh for concurrent status lookups", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const request = vi.fn().mockImplementation(async (url: string) => {
      if (url.endsWith("/collection/token/")) { await gate; return new Response(JSON.stringify({ access_token: "shared", expires_in: 300 }), { status: 200 }); }
      return new Response(JSON.stringify({ status: "PENDING", amount: "100", currency: "EUR" }), { status: 200 });
    });
    const provider = new MtnMomoProvider(environment, request);
    const first = provider.getPaymentStatus("ref-a"), second = provider.getPaymentStatus("ref-b");
    await Promise.resolve(); release();
    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
    expect(request.mock.calls.filter(([url]) => String(url).endsWith("/collection/token/")).length).toBe(1);
  });

  it("performs OAuth and status lookup from a fresh adapter without an inherited token", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "fresh-process-token", expires_in: 300 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "SUCCESSFUL", amount: "100", currency: "EUR", financialTransactionId: "txn-restart" }), { status: 200 }));
    await expect(new MtnMomoProvider(environment, request).getPaymentStatus("persisted-reference")).resolves.toMatchObject({ status: "SUCCESSFUL", providerTransactionId: "txn-restart" });
    expect(request.mock.calls.map(([url]) => String(url))).toEqual([
      "https://sandbox.example.test/collection/token/",
      "https://sandbox.example.test/collection/v1_0/requesttopay/persisted-reference",
    ]);
  });
});
