import { describe, expect, it, vi } from "vitest";
import { FakeMtnProvider } from "./support/fake-mtn-provider";

const input = (reference: string) => ({ reference, amount: "100.00", currency: "EUR", payerPhone: "1234567890", merchantAccount: {} });
describe("deterministic MTN test provider", () => {
  it("runs scripted PENDING to SUCCESSFUL and SUCCESSFUL to REVERSED sequences", async () => {
    const provider = new FakeMtnProvider("PENDING", { payment: ["PENDING", "SUCCESSFUL", "REVERSED"] });
    await provider.initiatePayment(input("payment"));
    await expect(provider.getPaymentStatus("payment")).resolves.toMatchObject({ status: "PENDING" });
    await expect(provider.getPaymentStatus("payment")).resolves.toMatchObject({ status: "SUCCESSFUL" });
    await expect(provider.getPaymentStatus("payment")).resolves.toMatchObject({ status: "REVERSED" });
  });
  it.each(["CUSTOMER_REJECTED", "INSUFFICIENT_FUNDS", "INVALID_PAYER"] as const)("maps %s to a safe failed provider state", async (outcome) => {
    const provider = new FakeMtnProvider(outcome); await provider.initiatePayment(input(outcome));
    await expect(provider.getPaymentStatus(outcome)).resolves.toMatchObject({ status: "FAILED" });
  });
  it("supports ambiguous and operational failures without fabricating success", async () => {
    await expect(new FakeMtnProvider("REQUEST_TIMEOUT").initiatePayment(input("timeout"))).rejects.toMatchObject({ code: "SUBMISSION_UNKNOWN" });
    const provider = new FakeMtnProvider("PENDING", { status: ["STATUS_TIMEOUT"] }); await provider.initiatePayment(input("status"));
    await expect(provider.getPaymentStatus("status")).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
  });
  it("cannot be constructed under production NODE_ENV", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => new FakeMtnProvider()).toThrow("forbidden in production");
    vi.unstubAllEnvs();
  });
});
