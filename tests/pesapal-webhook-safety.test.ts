import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), verify: vi.fn() }));
vi.mock("@/lib/prisma/client", () => ({
  prisma: { paymentGatewayWebhookLog: { create: mocks.create, update: mocks.update } },
}));
vi.mock("@/services/payments/pesapal-verification-service", () => ({
  PesapalVerificationService: class { verifyPesapalTransaction = mocks.verify; },
  isTransientPesapalError: (error: unknown) => (error as { code?: string })?.code === "PESAPAL_NETWORK_ERROR",
}));

import { POST } from "@/app/api/webhooks/pesapal/route";

afterEach(() => vi.clearAllMocks());

describe("Pesapal webhook safety", () => {
  it("logs an IPN then delegates payment authority to canonical verification", async () => {
    mocks.create.mockResolvedValue({ id: "audit-1" });
    mocks.verify.mockResolvedValue({ outcome: "COMPLETED" });
    const response = await POST(new Request("https://smartduka.test/api/webhooks/pesapal", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ OrderNotificationType: "IPNCHANGE", OrderTrackingId: "tracking-123", OrderMerchantReference: "ref-1", status: "COMPLETED" }),
    }));
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ trackingId: "tracking-123", reference: "ref-1", payload: { OrderTrackingId: "tracking-123", OrderMerchantReference: "ref-1", OrderNotificationType: "IPNCHANGE" } }) }));
    expect(mocks.verify).toHaveBeenCalledWith({ orderTrackingId: "tracking-123", claimedMerchantReference: "ref-1", source: "IPN" });
    expect(await response.json()).toEqual({ orderNotificationType: "IPNCHANGE", orderTrackingId: "tracking-123", orderMerchantReference: "ref-1", status: 200 });
  });

  it("rejects malformed IPNs without invoking verification", async () => {
    mocks.create.mockResolvedValue({ id: "audit-1" });
    const response = await POST(new Request("https://smartduka.test/api/webhooks/pesapal", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }));
    expect(mocks.verify).not.toHaveBeenCalled();
    expect((await response.json()).status).toBe(200);
  });

  it("asks Pesapal to retry only after transient authoritative verification failures", async () => {
    mocks.create.mockResolvedValue({ id: "audit-1" });
    mocks.verify.mockRejectedValue({ code: "PESAPAL_NETWORK_ERROR" });
    const response = await POST(new Request("https://smartduka.test/api/webhooks/pesapal", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ OrderNotificationType: "IPNCHANGE", OrderTrackingId: "tracking-123", OrderMerchantReference: "ref-1" }) }));
    expect(response.status).toBe(503);
    expect((await response.json()).status).toBe(500);
  });
});
