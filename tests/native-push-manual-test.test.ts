import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminContext: vi.fn(),
  runIsolatedNativeTest: vi.fn(),
}));

vi.mock("@/lib/auth/admin-context", () => ({
  requireAdminContext: mocks.requireAdminContext,
}));
vi.mock("@/services/notification-worker", () => ({
  NotificationWorkerService: {
    runIsolatedNativeTest: mocks.runIsolatedNativeTest,
  },
}));

import {
  NativePushManualTestDisabledError,
  NativePushManualTestService,
} from "@/services/native-push-manual-test";

const read = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("controlled native push testing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NATIVE_PUSH_MANUAL_TEST_ENABLED", "false");
    mocks.requireAdminContext.mockResolvedValue({
      userId: "admin-account",
      platformRole: "ADMIN",
    });
  });

  it("requires administrative authorization even while disabled", async () => {
    await expect(
      NativePushManualTestService.run("123e4567-e89b-12d3-a456-426614174000"),
    ).rejects.toBeInstanceOf(NativePushManualTestDisabledError);
    expect(mocks.requireAdminContext).toHaveBeenCalledWith(
      "platform:manage_announcements",
    );
    expect(mocks.runIsolatedNativeTest).not.toHaveBeenCalled();
  });

  it("targets only the invoking administrator account when explicitly enabled", async () => {
    vi.stubEnv("NATIVE_PUSH_MANUAL_TEST_ENABLED", "true");
    mocks.runIsolatedNativeTest.mockResolvedValue({
      requestId: "123e4567-e89b-12d3-a456-426614174000",
      status: "ACCEPTED",
    });

    await NativePushManualTestService.run(
      "123e4567-e89b-12d3-a456-426614174000",
    );

    expect(mocks.runIsolatedNativeTest).toHaveBeenCalledWith({
      userId: "admin-account",
      requestId: "123e4567-e89b-12d3-a456-426614174000",
    });
  });

  it("accepts no recipient, device, payload, or destination from the caller", () => {
    const route = read(
      "src/app/api/admin/notifications/native-test/route.ts",
    );
    const outbox = read("src/services/push-delivery-outbox.ts");

    expect(route).toContain(
      "z.object({ requestId: z.string().uuid() }).strict()",
    );
    expect(route).toContain("assertSameOrigin(request)");
    expect(outbox).toContain(
      "idempotencyKey = `push:native-test:${input.userId}:${input.requestId}`",
    );
    expect(outbox).toContain("id: job.id");
    expect(outbox).toContain("userId: input.userId");
    expect(outbox).toContain("kind: PushDeliveryKind.TEST");
    expect(outbox).not.toContain("firebase-admin/messaging");
  });

  it("keeps browser tests separate from native-only test jobs", () => {
    const outbox = read("src/services/push-delivery-outbox.ts");
    expect(outbox).toContain(
      "job.kind === PushDeliveryKind.TEST && !job.targetSubscriptionId",
    );
    expect(outbox).toContain("NativePushDeliveryService.deliver(job)");
    expect(read("src/services/native-push-delivery.ts")).toContain(
      'job.kind === "TEST" ? `test:${job.id}`',
    );
  });
});
