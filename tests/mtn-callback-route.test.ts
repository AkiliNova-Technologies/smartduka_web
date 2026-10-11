import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  intentFind: vi.fn(), auditCreate: vi.fn(), status: vi.fn(), reconcile: vi.fn(), enabled: vi.fn(), sandboxReady: vi.fn(), config: vi.fn(),
}));
vi.mock("@/lib/prisma/client", () => ({ prisma: { paymentIntent: { findFirst: mocks.intentFind }, auditLog: { create: mocks.auditCreate } } }));
vi.mock("@/lib/payments/payment-provider", () => ({ PaymentProviderRegistry: { isEnabled: mocks.enabled, isSandboxQualificationReady: mocks.sandboxReady } }));
vi.mock("@/lib/payments/providers/mtn-momo-provider", () => ({ getMtnMomoConfig: mocks.config, MtnMomoProvider: class { getPaymentStatus = mocks.status; } }));
vi.mock("@/services/payment-reconciliation", () => ({ PaymentReconciliationService: { applyProviderResult: mocks.reconcile } }));

import { POST, PUT } from "@/app/api/payments/callbacks/mtn/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.config.mockReturnValue({ environment: "sandbox", sandboxTesting: true });
  mocks.enabled.mockReturnValue(false); mocks.sandboxReady.mockReturnValue(true);
  mocks.auditCreate.mockResolvedValue({});
});

describe("MTN sandbox callback", () => {
  it("re-queries MTN and reconciles a known reference without trusting callback success", async () => {
    mocks.intentFind.mockResolvedValue({ id: "intent-a", vendorId: "vendor-a" });
    mocks.status.mockResolvedValue({ providerReference: "ref-a", status: "SUCCESSFUL", amount: "100", currency: "EUR", providerTransactionId: "txn-a" });
    mocks.reconcile.mockResolvedValue({ outcome: "PROCESSED" });
    const response = await POST(new Request("http://localhost/api/payments/callbacks/mtn", { method: "POST", body: JSON.stringify({ referenceId: "ref-a", status: "SUCCESSFUL", amount: "999999" }) }));
    expect(response.status).toBe(200); expect(mocks.status).toHaveBeenCalledWith("ref-a");
    expect(mocks.reconcile).toHaveBeenCalledWith(expect.objectContaining({ amount: "100", currency: "EUR", status: "SUCCESSFUL" }));
  });
  it("keeps a provider-pending callback pending and supports PUT", async () => {
    mocks.intentFind.mockResolvedValue({ id: "intent-a", vendorId: "vendor-a" }); mocks.status.mockResolvedValue({ providerReference: "ref-a", status: "PENDING", amount: "100", currency: "EUR" }); mocks.reconcile.mockResolvedValue({ outcome: "IGNORED" });
    expect((await PUT(new Request("http://localhost", { method: "PUT", body: JSON.stringify({ externalId: "ref-a" }) }))).status).toBe(202);
  });
  it("does not create or reconcile unknown references", async () => {
    mocks.intentFind.mockResolvedValue(null);
    expect((await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ referenceId: "unknown" }) }))).status).toBe(202);
    expect(mocks.status).not.toHaveBeenCalled(); expect(mocks.reconcile).not.toHaveBeenCalled();
  });
  it("rejects malformed callbacks and leaves status unresolved when MTN lookup fails", async () => {
    expect((await POST(new Request("http://localhost", { method: "POST", body: "null" }))).status).toBe(400);
    mocks.intentFind.mockResolvedValue({ id: "intent-a", vendorId: "vendor-a" }); mocks.status.mockRejectedValue(new Error("timeout"));
    expect((await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ referenceId: "ref-a", status: "SUCCESSFUL" }) }))).status).toBe(503);
    expect(mocks.reconcile).not.toHaveBeenCalled();
  });
});
