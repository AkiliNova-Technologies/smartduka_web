import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ verify: vi.fn() }));

vi.mock("@/services/payments/pesapal-verification-service", () => ({
  PesapalVerificationService: class { verifyPesapalTransaction = mocks.verify; },
}));

import { GET } from "@/app/payment/callback/route";

afterEach(() => vi.clearAllMocks());

describe("Pesapal callback safety", () => {
  it("uses API 3.0 callback identifiers only to trigger authoritative verification", async () => {
    mocks.verify.mockResolvedValue({ outcome: "COMPLETED" });
    const response = await GET(new Request("https://smartduka.test/payment/callback?OrderTrackingId=tracking-123&OrderMerchantReference=ref-1&OrderNotificationType=CALLBACKURL&status=COMPLETED"));
    expect(mocks.verify).toHaveBeenCalledWith({ orderTrackingId: "tracking-123", claimedMerchantReference: "ref-1", source: "CALLBACK" });
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://smartduka.test/orders");
  });

  it("does not treat callback query data as payment state or verify malformed callbacks", async () => {
    const response = await GET(new Request("https://smartduka.test/payment/callback?OrderTrackingId=tracking-123&OrderMerchantReference=ref-1&OrderNotificationType=IPNCHANGE&status=COMPLETED"));
    expect(mocks.verify).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://smartduka.test/orders");
  });

  it("keeps the browser flow safe when authoritative verification is transiently unavailable", async () => {
    mocks.verify.mockRejectedValue(new Error("provider unavailable"));
    const response = await GET(new Request("https://smartduka.test/payment/callback?OrderTrackingId=tracking-123&OrderMerchantReference=ref-1&OrderNotificationType=CALLBACKURL"));
    expect(mocks.verify).toHaveBeenCalledTimes(1);
    expect(response.headers.get("location")).toBe("https://smartduka.test/orders");
  });
});
