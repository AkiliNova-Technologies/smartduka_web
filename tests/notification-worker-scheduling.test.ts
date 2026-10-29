import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  announcements: vi.fn(),
  marketing: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@/services/announcements", () => ({
  AnnouncementService: { advanceLifecycle: mocks.announcements },
}));
vi.mock("@/services/marketing-notifications", () => ({
  MarketingNotificationService: { advanceLifecycle: mocks.marketing },
}));
vi.mock("@/services/push-delivery-outbox", () => ({
  PushDeliveryOutboxService: { run: mocks.push },
}));

import { NotificationWorkerService } from "@/services/notification-worker";
import { nativePushEnabled } from "@/services/native-push-delivery";

const read = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("notification worker scheduling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers one authenticated production schedule for the combined worker", () => {
    const config = JSON.parse(read("vercel.json")) as {
      crons: { path: string; schedule: string }[];
    };

    expect(config.crons).toEqual([
      {
        path: "/api/cron/push-delivery",
        schedule: "0 6 * * *",
      },
    ]);
  });

  it("advances publication before fanout and delivery", async () => {
    const order: string[] = [];
    mocks.announcements.mockImplementation(async () => {
      order.push("announcements");
      return { published: 1 };
    });
    mocks.marketing.mockImplementation(async () => {
      order.push("marketing");
      return { published: 1 };
    });
    mocks.push.mockImplementation(async () => {
      order.push("push");
      return { claimed: 1 };
    });

    await expect(NotificationWorkerService.run()).resolves.toEqual({
      announcements: { published: 1 },
      marketing: { published: 1 },
      push: { claimed: 1 },
    });
    expect(order).toEqual(["announcements", "marketing", "push"]);
  });

  it("keeps native delivery disabled unless explicitly enabled", () => {
    vi.stubEnv("NATIVE_PUSH_ENABLED", "false");
    expect(nativePushEnabled()).toBe(false);
    vi.stubEnv("NATIVE_PUSH_ENABLED", "true");
    expect(nativePushEnabled()).toBe(true);
    vi.unstubAllEnvs();
  });

  it("retains fanout ordering, eligibility checks, retries, and both transports", () => {
    const worker = read("src/services/push-delivery-outbox.ts");
    const announcement = worker.indexOf("AnnouncementPushService.runFanout(now)");
    const marketing = worker.indexOf("MarketingPushService.runFanout(now)");
    const candidates = worker.indexOf("const candidates = await prisma.pushDeliveryOutbox.findMany");

    expect(announcement).toBeGreaterThan(-1);
    expect(marketing).toBeGreaterThan(announcement);
    expect(candidates).toBeGreaterThan(marketing);
    expect(worker).toContain("NativePushDeliveryService.deliver(job)");
    expect(worker).toContain("webpush.sendNotification");
    expect(worker).toContain("MAX_ATTEMPTS = 5");
    expect(worker).toContain("pushDeliveryOutbox.upsert");
    expect(read("src/services/native-push-delivery.ts")).toContain(
      "skipDuplicates: true",
    );
    expect(worker).toContain("ANNOUNCEMENT_INELIGIBLE");
    expect(worker).toContain("MARKETING_CAMPAIGN_INELIGIBLE");
  });
});
