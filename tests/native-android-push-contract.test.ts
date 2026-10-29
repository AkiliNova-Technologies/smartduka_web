import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("native Android push contract", () => {
  it("keeps device registration account-scoped and tokens encrypted", () => {
    const service = read("src/services/user-devices.ts");
    expect(service).toContain("requireActiveUserId()");
    expect(service).toContain("encryptPushSubscriptionValue(input.pushToken)");
    expect(service).toContain('createHash("sha256")');
    expect(service).toContain("deviceId: input.deviceId");
  });

  it("uses per-device delivery idempotency and invalid-token cleanup", () => {
    const schema = read("prisma/schema.prisma");
    const delivery = read("src/services/native-push-delivery.ts");
    expect(schema).toContain("@@unique([outboxId, deviceId])");
    expect(delivery).toContain("registration-token-not-registered");
    expect(delivery).toContain("token: decryptPushSubscriptionValue");
    expect(delivery).not.toContain("fid: decryptPushSubscriptionValue");
    expect(delivery).toContain("enabled: invalid ? false : undefined");
    expect(delivery).toContain('version: "1"');
  });

  it("retains announcement expiry and marketing consent enforcement", () => {
    const worker = read("src/services/push-delivery-outbox.ts");
    expect(worker).toContain("ANNOUNCEMENT_INELIGIBLE");
    expect(worker).toContain("marketingConsentEligible");
    expect(worker).toContain("NativePushDeliveryService.deliver(job)");
  });

  it("keeps browser push delivery in the shared bounded worker", () => {
    const worker = read("src/services/push-delivery-outbox.ts");
    expect(worker).toContain("webpush.sendNotification");
    expect(worker).toContain("MAX_ATTEMPTS = 5");
  });

  it("rejects mismatched Firebase client and server projects", () => {
    const admin = read("src/lib/firebase/admin.ts");
    expect(admin).toContain("projectId !== serverProjectId");
    expect(admin).toContain("Firebase client and server project IDs do not match");
    expect(admin).toContain("projectId: serverProjectId");
  });
});
