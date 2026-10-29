import { describe, expect, it } from "vitest";
import { isSecretAuthenticatedCronPassThrough } from "@/proxy";

describe("push delivery cron proxy boundary", () => {
  it("passes only the dedicated GET worker with a bearer credential", () => {
    expect(
      isSecretAuthenticatedCronPassThrough(
        "GET",
        "/api/cron/push-delivery",
        "Bearer configured-cron-secret",
      ),
    ).toBe(true);

    for (const [method, pathname, authorization] of [
      ["POST", "/api/cron/push-delivery", "Bearer configured-cron-secret"],
      ["GET", "/api/cron/push-delivery/history", "Bearer configured-cron-secret"],
      ["GET", "/api/cron/platform-revenue", "Bearer configured-cron-secret"],
      ["GET", "/api/cron/push-delivery", "Basic configured-cron-secret"],
      ["GET", "/api/cron/push-delivery", "Bearer"],
    ]) {
      expect(
        isSecretAuthenticatedCronPassThrough(
          method,
          pathname,
          authorization,
        ),
      ).toBe(false);
    }
  });
});
