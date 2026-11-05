import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { scheduleDue } = vi.hoisted(() => ({ scheduleDue: vi.fn() }));
vi.mock("@/services/payment-reconciliation", () => ({
  PaymentReconciliationService: { scheduleDue },
}));

import { GET } from "@/app/api/cron/payment-reconciliation/route";

describe("payment reconciliation cron route", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "payment-worker-secret");
    vi.stubEnv("SCHEDULED_PAYMENT_RECONCILIATION_ENABLED", "true");
    scheduleDue.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("rejects unauthorized invocation without touching reconciliation", async () => {
    const missing = await GET(new Request("https://mezora.test/api/cron/payment-reconciliation"));
    const incorrect = await GET(new Request("https://mezora.test/api/cron/payment-reconciliation", {
      headers: { authorization: "Bearer incorrect" },
    }));
    expect(missing.status).toBe(401);
    expect(incorrect.status).toBe(401);
    expect(scheduleDue).not.toHaveBeenCalled();
  });

  it("runs bounded reconciliation and returns only an outcome summary", async () => {
    vi.stubEnv("PAYMENT_RECONCILIATION_BATCH_SIZE", "25");
    vi.stubEnv("PAYMENT_RECONCILIATION_CONCURRENCY", "3");
    vi.stubEnv("PAYMENT_RECONCILIATION_MAX_RUNTIME_MS", "15000");
    scheduleDue.mockResolvedValue([
      { outcome: "TRANSITION_APPLIED" },
      { outcome: "RETRY_SCHEDULED" },
      { outcome: "TRANSITION_APPLIED" },
    ]);
    const response = await GET(new Request("https://mezora.test/api/cron/payment-reconciliation", {
      headers: { authorization: "Bearer payment-worker-secret" },
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { processed: 3, outcomes: { TRANSITION_APPLIED: 2, RETRY_SCHEDULED: 1 } } });
    expect(scheduleDue).toHaveBeenCalledWith(25, { concurrency: 3, maxRuntimeMs: 15000 });
  });

  it("is disabled by default even for an authenticated scheduler", async () => {
    vi.stubEnv("SCHEDULED_PAYMENT_RECONCILIATION_ENABLED", "false");
    const response = await GET(new Request("https://mezora.test/api/cron/payment-reconciliation", {
      headers: { authorization: "Bearer payment-worker-secret" },
    }));
    expect(await response.json()).toEqual({ data: { disabled: true } });
    expect(scheduleDue).not.toHaveBeenCalled();
  });
});
