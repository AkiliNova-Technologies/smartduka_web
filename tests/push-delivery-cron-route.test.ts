import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { run } = vi.hoisted(() => ({ run: vi.fn() }));

vi.mock("@/services/notification-worker", () => ({
  NotificationWorkerService: { run },
}));

import { GET } from "@/app/api/cron/push-delivery/route";

describe("push delivery cron route", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "push-worker-test-secret");
    run.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects missing or incorrect credentials without running the worker", async () => {
    const missing = await GET(new Request("https://mwezora.test/api/cron/push-delivery"));
    const incorrect = await GET(
      new Request("https://mwezora.test/api/cron/push-delivery", {
        headers: { authorization: "Bearer incorrect" },
      }),
    );

    expect(missing.status).toBe(401);
    expect(incorrect.status).toBe(401);
    expect(run).not.toHaveBeenCalled();
  });

  it("runs only the bounded push worker for a valid cron secret", async () => {
    run.mockResolvedValue({
      announcements: { published: 0, expired: 0 },
      marketing: { published: 0, expired: 0 },
      push: { claimed: 2, delivered: 1, failed: 0 },
    });

    const response = await GET(
      new Request("https://mwezora.test/api/cron/push-delivery", {
        headers: { authorization: "Bearer push-worker-test-secret" },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: {
        announcements: { published: 0, expired: 0 },
        marketing: { published: 0, expired: 0 },
        push: { claimed: 2, delivered: 1, failed: 0 },
      },
    });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("returns a sanitized failure without exposing transport details", async () => {
    run.mockRejectedValue(new Error("sensitive transport detail"));

    const response = await GET(
      new Request("https://mwezora.test/api/cron/push-delivery", {
        headers: { authorization: "Bearer push-worker-test-secret" },
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: {
        code: "WORKER_FAILED",
        message: "Push delivery worker failed.",
      },
    });
  });
});
