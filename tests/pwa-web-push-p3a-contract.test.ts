import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { browserPushSubscriptionSchema } from "@/lib/push-subscription-schema";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("P3A browser push boundaries", () => {
  it("keeps browser subscriptions separate from native device tokens", () => {
    const schema = read("prisma/schema.prisma");
    expect(schema).toContain("model BrowserPushSubscription");
    expect(schema).toMatch(/endpointHash\s+String\s+@unique/);
    expect(schema).toContain("model UserDevice");
    expect(read("src/services/user-devices.ts")).not.toContain("BrowserPushSubscription");
  });

  it("validates HTTPS subscriptions without accepting a user id", () => {
    const valid = { endpoint: "https://push.example.test/subscription", keys: { p256dh: "a".repeat(32), auth: "b".repeat(24) } };
    expect(browserPushSubscriptionSchema.parse(valid)).toEqual(valid);
    expect(() => browserPushSubscriptionSchema.parse({ ...valid, userId: "other" })).toThrow();
    expect(() => browserPushSubscriptionSchema.parse({ ...valid, endpoint: "http://push.example.test/subscription" })).toThrow();
  });

  it("accepts the standards-based PushSubscription.toJSON shape including expirationTime", () => {
    const browserPayload = { endpoint: "https://push.example.test/subscription", expirationTime: null, keys: { p256dh: "a".repeat(87), auth: "b".repeat(22) } };
    expect(browserPushSubscriptionSchema.parse(browserPayload)).toEqual(browserPayload);
    expect(() => browserPushSubscriptionSchema.parse({ endpoint: browserPayload.endpoint, keys: { auth: browserPayload.keys.auth } })).toThrow();
    expect(() => browserPushSubscriptionSchema.parse({ endpoint: browserPayload.endpoint, keys: { p256dh: browserPayload.keys.p256dh } })).toThrow();
  });

  it("has a durable, bounded, idempotent outbox worker", () => {
    const schema = read("prisma/schema.prisma");
    const worker = read("src/services/push-delivery-outbox.ts");
    expect(schema).toContain("model PushDeliveryOutbox");
    expect(schema).toMatch(/idempotencyKey\s+String\s+@unique/);
    expect(worker).toContain("const MAX_ATTEMPTS = 5");
    expect(worker).toContain("updateMany");
    expect(worker).toContain("PushDeliveryStatus.PROCESSING");
    expect(worker).toContain("status === 404 || status === 410");
  });

  it("keeps navigation internal and handles pushes in the existing worker", () => {
    const worker = read("public/sw.js");
    expect(worker).toContain('self.addEventListener("push"');
    expect(worker).toContain('self.addEventListener("notificationclick"');
    expect(worker).toContain("safeInternalPath");
    expect(worker).toContain("event.waitUntil");
  });

  it("requires explicit user action before requesting browser permission", () => {
    const settings = read("src/hooks/use-push-notification-settings.ts");
    expect(settings).toContain("Notification.requestPermission()");
    expect(settings).toContain("const enable = async");
    expect(settings).not.toContain("useEffect(() => { Notification.requestPermission");
  });
});
