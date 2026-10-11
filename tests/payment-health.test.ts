import { describe, expect, it } from "vitest";
import { paymentHealth } from "@/services/payment-health";

const now = new Date("2026-10-08T12:00:00Z");
const pending = (minutes: number, attempts = 0, error: string | null = null) => ({ status: "PENDING", createdAt: new Date(now.getTime() - minutes * 60_000), reconcileAttempts: attempts, lastReconcileError: error });
describe("payment health", () => {
  it("derives pending health without failing a payment based on age", () => {
    expect(paymentHealth(pending(1), now)).toBe("HEALTHY");
    expect(paymentHealth(pending(1, 1, "timeout"), now)).toBe("RETRYING");
    expect(paymentHealth(pending(11), now)).toBe("CONFIRMATION_DELAYED");
    expect(paymentHealth(pending(24 * 60 + 1), now)).toBe("STUCK");
    expect(paymentHealth(pending(1, 12), now)).toBe("NEEDS_REVIEW");
  });
  it("does not assign pending health to settled states, while reversals require review", () => {
    expect(paymentHealth({ ...pending(1), status: "SUCCESSFUL" }, now)).toBeNull();
    expect(paymentHealth({ ...pending(1), status: "REVERSED" }, now)).toBe("NEEDS_REVIEW");
  });
});
