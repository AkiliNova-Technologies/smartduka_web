import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dispatchFindMany: vi.fn(), dispatchUpdateMany: vi.fn(), dispatchCreateMany: vi.fn(), dispatchFindFirst: vi.fn(),
  eventFindMany: vi.fn(), followFindMany: vi.fn(), notificationCount: vi.fn(), notificationUpsert: vi.fn(), outboxUpsert: vi.fn(), entitlement: vi.fn(),
}));
vi.mock("@/lib/prisma/client", () => ({ prisma: {
  storePublicationDispatch: { findMany: mocks.dispatchFindMany, updateMany: mocks.dispatchUpdateMany, createMany: mocks.dispatchCreateMany, findFirst: mocks.dispatchFindFirst },
  storePublicationEvent: { findMany: mocks.eventFindMany }, storeFollow: { findMany: mocks.followFindMany },
  notification: { count: mocks.notificationCount, upsert: mocks.notificationUpsert }, pushDeliveryOutbox: { upsert: mocks.outboxUpsert },
} }));
vi.mock("@/services/vendor-entitlement", () => ({ VendorEntitlementService: { getForShop: mocks.entitlement } }));

import { FollowerNotificationService } from "@/services/follower-notifications";

const event = { id: "event-a", eventKey: "store-publication:publication-a:published", notificationEligible: true, publication: { id: "publication-a", vendorId: "vendor-a", kind: "ANNOUNCEMENT", notificationTopic: "ANNOUNCEMENT", status: "PUBLISHED", title: "Store update", body: "We are open later.", imageUrl: null, destination: "STOREFRONT", destinationProduct: null, publishedAt: new Date("2026-11-04T08:00:00Z"), expiresAt: null, vendor: { id: "vendor-a", status: "ACTIVE", storeName: "Shop A", slug: "shop-a", logoUrl: null } } };
const dispatch = { id: "dispatch-a", cursorFollowId: null, attempts: 1, publicationEvent: event };

describe("FollowerNotificationService", () => {
  beforeEach(() => {
    vi.clearAllMocks(); process.env.FOLLOWER_NOTIFICATIONS_ENABLED = "true"; delete process.env.FOLLOWER_PUSH_ENABLED;
    mocks.eventFindMany.mockResolvedValue([]); mocks.dispatchCreateMany.mockResolvedValue({ count: 0 }); mocks.dispatchFindMany.mockResolvedValue([{ id: "dispatch-a" }]);
    mocks.dispatchUpdateMany.mockResolvedValue({ count: 1 }); mocks.dispatchFindFirst.mockResolvedValue(dispatch); mocks.followFindMany.mockResolvedValue([]);
    mocks.notificationCount.mockResolvedValue(0); mocks.notificationUpsert.mockResolvedValue({ id: "notification-a" }); mocks.outboxUpsert.mockResolvedValue({}); mocks.entitlement.mockResolvedValue({ capabilities: { ADVERTISING_ACCESS: true } });
  });
  afterEach(() => { delete process.env.FOLLOWER_NOTIFICATIONS_ENABLED; delete process.env.FOLLOWER_PUSH_ENABLED; });

  it("is disabled by default and creates no jobs", async () => {
    delete process.env.FOLLOWER_NOTIFICATIONS_ENABLED;
    await expect(FollowerNotificationService.run()).resolves.toMatchObject({ disabled: true, claimed: 0 });
    expect(mocks.eventFindMany).not.toHaveBeenCalled();
  });

  it("schedules publication events idempotently with a database uniqueness boundary", async () => {
    mocks.eventFindMany.mockResolvedValue([{ id: "event-a" }, { id: "event-b" }]); mocks.dispatchCreateMany.mockResolvedValue({ count: 1 });
    const now = new Date("2026-11-05T09:00:00Z");
    await expect(FollowerNotificationService.schedule(now)).resolves.toBe(1);
    expect(mocks.dispatchCreateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: [{ publicationEventId: "event-a", nextAttemptAt: now }, { publicationEventId: "event-b", nextAttemptAt: now }],
      skipDuplicates: true,
    }));
  });

  it("creates an in-app notification for an eligible current follower", async () => {
    mocks.followFindMany.mockResolvedValue([{ id: "follow-a", customerId: "customer-a", customer: { settings: { promotionalPushNotifications: true, followedStoreAnnouncements: true } } }]);
    const result = await FollowerNotificationService.run(new Date("2026-11-05T09:00:00Z"));
    expect(result).toMatchObject({ claimed: 1, completed: 1 });
    expect(mocks.followFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ vendorId: "vendor-a", customer: expect.objectContaining({ settings: expect.objectContaining({ promotionalInAppNotifications: true, followedStoreAnnouncements: true }) }) }) }));
    expect(mocks.notificationUpsert).toHaveBeenCalledWith(expect.objectContaining({ where: { idempotencyKey: "store-publication:publication-a:published:customer-a" }, create: expect.objectContaining({ eventType: "FOLLOWED_STORE_ANNOUNCEMENT", userId: "customer-a", vendorId: "vendor-a" }) }));
    expect(mocks.outboxUpsert).not.toHaveBeenCalled();
  });

  it("does not create a recipient after unfollowing before processing", async () => {
    mocks.followFindMany.mockResolvedValue([]);
    await FollowerNotificationService.run();
    expect(mocks.notificationUpsert).not.toHaveBeenCalled();
    expect(mocks.dispatchUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "DELIVERED" }) }));
  });

  it("queues push only behind the independent rollout gate and explicit push consent", async () => {
    process.env.FOLLOWER_PUSH_ENABLED = "true";
    mocks.followFindMany.mockResolvedValue([{ id: "follow-a", customerId: "customer-a", customer: { settings: { promotionalPushNotifications: true, followedStoreAnnouncements: true } } }]);
    await FollowerNotificationService.run();
    expect(mocks.outboxUpsert).toHaveBeenCalledWith(expect.objectContaining({ where: { storePublicationEventId_userId: { storePublicationEventId: "event-a", userId: "customer-a" } }, create: expect.objectContaining({ kind: "MARKETING", notificationId: "notification-a" }) }));
  });

  it("enforces the rolling frequency limit before notification creation", async () => {
    process.env.FOLLOWER_NOTIFICATION_DAILY_LIMIT = "3"; mocks.notificationCount.mockResolvedValue(3);
    mocks.followFindMany.mockResolvedValue([{ id: "follow-a", customerId: "customer-a", customer: { settings: { promotionalPushNotifications: true, followedStoreAnnouncements: true } } }]);
    await FollowerNotificationService.run();
    expect(mocks.notificationUpsert).not.toHaveBeenCalled();
    delete process.env.FOLLOWER_NOTIFICATION_DAILY_LIMIT;
  });

  it("uses a compare-and-set claim so a concurrent worker cannot duplicate processing", async () => {
    mocks.dispatchUpdateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    const result = await FollowerNotificationService.run();
    expect(result.claimed).toBe(0);
    expect(mocks.dispatchFindFirst).not.toHaveBeenCalled();
  });

  it("retries interrupted failures and records only sanitized failure categories", async () => {
    mocks.followFindMany.mockRejectedValue(new Error("transport details must not be logged")); mocks.dispatchFindFirst.mockResolvedValueOnce(dispatch).mockResolvedValueOnce({ attempts: 1 });
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const result = await FollowerNotificationService.run();
    expect(result.retried).toBe(1);
    expect(mocks.dispatchUpdateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "RETRYING", failureCode: "FOLLOWER_FANOUT_FAILED" }) }));
    expect(warning).toHaveBeenCalledWith("[follower-notifications] batch failed", expect.not.objectContaining({ message: expect.anything() }));
    warning.mockRestore();
  });
});
