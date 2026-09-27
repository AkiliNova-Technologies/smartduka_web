import { beforeEach, describe, expect, it, vi } from "vitest";
import { Decimal } from "@prisma/client/runtime/client";
import { PaymentAttemptStatus } from "@prisma/client";
const economics = vi.hoisted(() => ({ allocate: vi.fn() }));
vi.mock("@/services/marketplace-economics", () => ({
  MarketplaceEconomicsService: { allocatePaidOrderEconomics: economics.allocate },
}));

import { PesapalVerificationService } from "@/services/payments/pesapal-verification-service";

const attempt = (overrides: Record<string, unknown> = {}) => ({
  id: "attempt-1", orderId: "order-1", merchantReference: "ref-1", providerTrackingId: "tracking-1",
  amount: new Decimal("17500.00"), currency: "UGX", status: PaymentAttemptStatus.INITIATED,
  orderCompletedAt: null, ...overrides,
});
const provider = (overrides: Record<string, unknown> = {}) => ({
  merchantReference: "ref-1", amount: "17500", currency: "UGX", status: "COMPLETED" as const,
  statusCode: 1 as const, confirmationCode: "confirm-1", paymentMethod: "MOBILE_MONEY", ...overrides,
});

function harness(localAttempt: ReturnType<typeof attempt> | null = attempt(), status = provider()) {
  const paymentAttempt = { findUnique: vi.fn().mockResolvedValue(localAttempt), updateMany: vi.fn() };
  const order = { updateMany: vi.fn() };
  paymentAttempt.updateMany.mockResolvedValue({ count: 1 });
  order.updateMany.mockResolvedValue({ count: 1 });
  const database = { paymentAttempt, order, $transaction: vi.fn(async (callback) => callback({ paymentAttempt, order })) };
  const client = { getTransactionStatus: vi.fn().mockResolvedValue(status) };
  return { paymentAttempt, order, database, client, service: new PesapalVerificationService(client as never, database as never) };
}

describe("PesapalVerificationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    economics.allocate.mockResolvedValue({ allocated: true });
  });

  it("preserves verified payment completion when allocation fails and permits later retry", async () => {
    const h = harness();
    economics.allocate.mockRejectedValueOnce(new Error("ledger temporarily unavailable"));

    await expect(h.service.verifyPesapalTransaction({ orderTrackingId: "tracking-1", source: "IPN" })).resolves.toMatchObject({ outcome: "COMPLETED" });
    expect(h.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { paymentStatus: "COMPLETED" } }));
    expect(economics.allocate).toHaveBeenCalledWith("order-1", "attempt-1");

    economics.allocate.mockResolvedValueOnce({ allocated: true });
    await expect(h.service.verifyPesapalTransaction({ orderTrackingId: "tracking-1", source: "RECONCILIATION" })).resolves.toMatchObject({ outcome: "COMPLETED" });
    expect(economics.allocate).toHaveBeenCalledTimes(2);
  });

  it("only completes an Order after authoritative completed verification", async () => {
    const h = harness();
    await expect(h.service.verifyPesapalTransaction({ orderTrackingId: "tracking-1", source: "IPN" })).resolves.toMatchObject({ outcome: "COMPLETED" });
    expect(h.client.getTransactionStatus).toHaveBeenCalledWith("tracking-1");
    expect(h.paymentAttempt.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "COMPLETED", confirmationCode: "confirm-1", paymentMethod: "MOBILE_MONEY", completedAt: expect.any(Date) }) }));
    expect(h.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { paymentStatus: "COMPLETED" } }));
  });

  it.each([
    ["merchant", provider({ merchantReference: "forged" })],
    ["amount", provider({ amount: "1" })],
    ["currency", provider({ currency: "KES" })],
  ])("fails closed on provider %s mismatch", async (_kind, result) => {
    const h = harness(attempt(), result);
    await expect(h.service.verifyPesapalTransaction({ orderTrackingId: "tracking-1", source: "CALLBACK" })).resolves.toMatchObject({ outcome: "MISMATCH" });
    expect(h.database.$transaction).not.toHaveBeenCalled();
    expect(h.order.updateMany).not.toHaveBeenCalled();
  });

  it("does not let a forged claimed reference select another attempt", async () => {
    const h = harness();
    await expect(h.service.verifyPesapalTransaction({ orderTrackingId: "tracking-1", claimedMerchantReference: "ref-other", source: "IPN" })).resolves.toMatchObject({ outcome: "MISMATCH" });
    expect(h.client.getTransactionStatus).not.toHaveBeenCalled();
  });

  it("recovers SUBMISSION_UNKNOWN only after provider merchant, amount, and currency verification", async () => {
    const local = attempt({ providerTrackingId: null, status: PaymentAttemptStatus.SUBMISSION_UNKNOWN });
    const h = harness(null, provider());
    h.paymentAttempt.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(local);
    let release!: () => void;
    h.client.getTransactionStatus.mockImplementation(() => new Promise((resolve) => { release = () => resolve(provider()); }));
    const pending = h.service.verifyPesapalTransaction({ orderTrackingId: "recovered-123", claimedMerchantReference: "ref-1", source: "IPN" });
    await vi.waitFor(() => expect(h.client.getTransactionStatus).toHaveBeenCalled());
    expect(h.paymentAttempt.updateMany).not.toHaveBeenCalled();
    release();
    await expect(pending).resolves.toMatchObject({ outcome: "COMPLETED", recoveredTrackingId: true });
    expect(h.paymentAttempt.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ providerTrackingId: "recovered-123" }) }));
  });

  it("maps verified FAILED and INVALID to attempt FAILED without changing the Order", async () => {
    for (const result of [provider({ status: "FAILED", statusCode: 2 }), provider({ status: "INVALID", statusCode: 0 })]) {
      const h = harness(attempt(), result);
      await expect(h.service.verifyPesapalTransaction({ orderTrackingId: "tracking-1", source: "IPN" })).resolves.toMatchObject({ outcome: "FAILED" });
      expect(h.paymentAttempt.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "FAILED", providerStatus: result.status }) }));
      expect(h.order.updateMany).not.toHaveBeenCalled();
    }
  });

  it("permits COMPLETED to REVERSED and only reverses an order completed by that attempt", async () => {
    const h = harness(attempt({ status: PaymentAttemptStatus.COMPLETED, orderCompletedAt: new Date() }), provider({ status: "REVERSED", statusCode: 3 }));
    await expect(h.service.verifyPesapalTransaction({ orderTrackingId: "tracking-1", source: "RECONCILIATION" })).resolves.toMatchObject({ outcome: "REVERSED" });
    expect(h.paymentAttempt.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "REVERSED", reversedAt: expect.any(Date) }) }));
    expect(h.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { paymentStatus: "REVERSED" } }));
  });

  it("does not regress a completed attempt when a stale FAILED status is observed", async () => {
    const h = harness(attempt({ status: PaymentAttemptStatus.COMPLETED }), provider({ status: "FAILED", statusCode: 2 }));
    h.paymentAttempt.updateMany.mockResolvedValue({ count: 0 });
    await expect(h.service.verifyPesapalTransaction({ orderTrackingId: "tracking-1", source: "IPN" })).resolves.toMatchObject({ outcome: "STALE" });
    expect(h.order.updateMany).not.toHaveBeenCalled();
  });

  it("returns unmatched without mutating any order", async () => {
    const h = harness(null);
    h.paymentAttempt.findUnique.mockResolvedValue(null);
    await expect(h.service.verifyPesapalTransaction({ orderTrackingId: "unknown-123", source: "CALLBACK" })).resolves.toEqual({ outcome: "UNMATCHED" });
    expect(h.client.getTransactionStatus).not.toHaveBeenCalled();
    expect(h.database.$transaction).not.toHaveBeenCalled();
  });
});
