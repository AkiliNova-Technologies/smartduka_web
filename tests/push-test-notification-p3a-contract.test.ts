import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { pushTestRequestSchema } from "@/lib/push-test-schema";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("P3A test notification boundaries", () => {
  const request = {
    endpoint: "https://push.example.test/subscription",
    requestId: "5a706231-7fd1-4bd4-b3ab-4d5e51fdff6d",
  };

  it("accepts only a current-browser locator and an opaque request id", () => {
    expect(pushTestRequestSchema.parse(request)).toEqual(request);
    expect(() => pushTestRequestSchema.parse({ ...request, userId: "another-user" })).toThrow();
    expect(() => pushTestRequestSchema.parse({ ...request, endpoint: "http://push.example.test/subscription" })).toThrow();
    expect(() => pushTestRequestSchema.parse({ ...request, title: "untrusted" })).toThrow();
  });

  it("has a dedicated targeted outbox representation rather than a fake business event", () => {
    const schema = read("prisma/schema.prisma");
    const service = read("src/services/push-delivery-outbox.ts");
    expect(schema).toContain("TEST");
    expect(schema).toMatch(/targetSubscriptionId\s+String\?/);
    expect(schema).toMatch(/targetSubscriptionVersion\s+Int\?/);
    expect(service).toContain("static async enqueueTest");
    expect(service).toContain("kind: PushDeliveryKind.TEST");
    expect(service).toContain("targetSubscriptionId: subscription.id");
    expect(service).toContain("Mwezora notifications are working");
    expect(service).toContain("Your device is ready to receive important updates from Mwezora.");
  });

  it("only sends a targeted job to the verified active subscription", () => {
    const service = read("src/services/push-delivery-outbox.ts");
    expect(service).toContain("subscription.userId !== input.userId");
    expect(service).toContain("BrowserPushSubscriptionStatus.ACTIVE");
    expect(service).toContain("subscription.id === job.targetSubscriptionId");
    expect(service).toContain("subscription.registrationVersion === job.targetSubscriptionVersion");
    expect(service).toContain("status === 404 || status === 410");
  });

  it("keeps the endpoint authenticated, CSRF-protected, fixed-payload, and rate-limited", () => {
    const route = read("src/app/api/v1/push/test/route.ts");
    expect(route).toContain("assertSameOrigin(request)");
    expect(route).toContain("requireActiveUserId()");
    expect(route).toContain("hashPushEndpoint(input.endpoint)");
    expect(route).toContain("browser-push-test:account");
    expect(route).toContain("3, 60 * 60_000");
    expect(route).toContain("NO_ACTIVE_SUBSCRIPTION");
    expect(route).toContain("PUSH_UNAVAILABLE");
  });

  it("checks current-device ownership without placing its endpoint in a URL", () => {
    const client = read("src/lib/push-client.ts");
    const route = read("src/app/api/v1/push/subscription/status/route.ts");
    expect(client).toContain('"/api/v1/push/subscription/status"');
    expect(client).not.toContain("?endpoint=");
    expect(route).toContain("assertSameOrigin(request)");
    expect(route).toContain("await request.json()");
  });

  it("uses a separate stable test tag and preserves safe internal click navigation", () => {
    const worker = read("public/sw.js");
    expect(worker).toContain('payload.tag === "mwezora-push-test"');
    expect(worker).toContain('"mwezora-push-test"');
    expect(worker).toContain("safeInternalPath");
    expect(worker).toContain('self.addEventListener("notificationclick"');
  });

  it("only displays the test control for a current subscribed browser and reports enqueueing honestly", () => {
    const settings = read("src/components/settings/PushNotificationSettings.tsx");
    const hook = read("src/hooks/use-push-notification-settings.ts");
    expect(hook).toContain("pushClient.enqueueTest");
    expect(hook).toContain("crypto.randomUUID()");
    expect(settings).toContain("subscribed && !unavailable && !installationRequired && !denied");
    expect(hook).toContain("Test notification queued. It should arrive shortly.");
  });
});
