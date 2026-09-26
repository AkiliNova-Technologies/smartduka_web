import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock("@/lib/prisma/client", () => ({
  prisma: { paymentGatewayWebhookLog: { create: mocks.create } },
}));

import { POST } from "@/app/api/webhooks/pesapal/route";

afterEach(() => {
  vi.unstubAllEnvs();
  mocks.create.mockReset();
});

describe("Pesapal webhook safety", () => {
  it("fails closed in production before accepting or persisting a callback", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = await POST(
      new Request("https://smartduka.test/api/webhooks/pesapal", {
        method: "POST",
        body: JSON.stringify({
          OrderTrackingId: "untrusted-tracking-id",
          OrderMerchantReference: "untrusted-order-number",
        }),
      }),
    );

    expect(response.status).toBe(503);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
