import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  PlatformRole,
  StorePublicationKind,
  StorePublicationStatus,
  StorePublicationTopic,
  UserStatus,
  VendorStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { FollowerNotificationService } from "@/services/follower-notifications";
import { StoreFollowingService } from "@/services/store-following";

const enabled = process.env.RUN_FOLLOWER_NOTIFICATIONS_DB_TESTS === "1";
const marker = `f5-${randomUUID()}`;
const ids = {
  owner: `${marker}-owner`,
  eligible: `${marker}-eligible`,
  noConsent: `${marker}-no-consent`,
  suspended: `${marker}-suspended`,
  vendor: `${marker}-vendor`,
};

describe.skipIf(!enabled)("F5 follower notification database integration", () => {
  beforeAll(async () => {
    process.env.FOLLOWER_NOTIFICATIONS_ENABLED = "true";
    process.env.FOLLOWER_PUSH_ENABLED = "false";
    await prisma.user.createMany({
      data: [
        { id: ids.owner, name: "F5 Owner", email: `${ids.owner}@test.invalid`, status: UserStatus.ACTIVE, platformRole: PlatformRole.VENDOR },
        { id: ids.eligible, name: "F5 Eligible", email: `${ids.eligible}@test.invalid`, status: UserStatus.ACTIVE, platformRole: PlatformRole.CUSTOMER },
        { id: ids.noConsent, name: "F5 No Consent", email: `${ids.noConsent}@test.invalid`, status: UserStatus.ACTIVE, platformRole: PlatformRole.CUSTOMER },
        { id: ids.suspended, name: "F5 Suspended", email: `${ids.suspended}@test.invalid`, status: UserStatus.SUSPENDED, platformRole: PlatformRole.CUSTOMER },
      ],
    });
    await prisma.userSettings.createMany({
      data: [
        { userId: ids.eligible, promotionalInAppNotifications: true, followedStoreAnnouncements: true },
        { userId: ids.noConsent, promotionalInAppNotifications: false, followedStoreAnnouncements: true },
        { userId: ids.suspended, promotionalInAppNotifications: true, followedStoreAnnouncements: true },
      ],
    });
    await prisma.vendorProfile.create({
      data: { id: ids.vendor, ownerId: ids.owner, storeName: "F5 Store", slug: marker, status: VendorStatus.ACTIVE },
    });
  });

  afterAll(async () => {
    delete process.env.FOLLOWER_NOTIFICATIONS_ENABLED;
    delete process.env.FOLLOWER_PUSH_ENABLED;
    await prisma.storePublication.deleteMany({ where: { vendorId: ids.vendor } });
    await prisma.user.deleteMany({ where: { id: { in: [ids.owner, ids.eligible, ids.noConsent, ids.suspended] } } });
    await prisma.$disconnect();
  });

  const publish = async (suffix: string) => {
    const publishedAt = new Date();
    return prisma.storePublication.create({
      data: {
        vendorId: ids.vendor,
        kind: StorePublicationKind.ANNOUNCEMENT,
        notificationTopic: StorePublicationTopic.ANNOUNCEMENT,
        status: StorePublicationStatus.PUBLISHED,
        title: `F5 announcement ${suffix}`,
        body: "Follower notification integration validation.",
        publishedAt,
        createdById: ids.owner,
        reviewedById: ids.owner,
        reviewedAt: publishedAt,
        publishedById: ids.owner,
        publicationEvent: {
          create: {
            vendorId: ids.vendor,
            eventKey: `${marker}:${suffix}`,
            notificationEligible: true,
            eligibilityMetadata: { deliveryEnabled: false, requiresMarketingConsent: true },
            publishedAt,
          },
        },
      },
      include: { publicationEvent: true },
    });
  };

  it("enforces unique follows and fans out only to currently eligible followers", async () => {
    await expect(StoreFollowingService.follow(ids.eligible, ids.vendor)).resolves.toMatchObject({ following: true });
    await expect(StoreFollowingService.follow(ids.noConsent, ids.vendor)).resolves.toMatchObject({ following: true });
    await expect(StoreFollowingService.follow(ids.suspended, ids.vendor)).resolves.toMatchObject({ following: true });
    expect(await prisma.storeFollow.count({ where: { customerId: ids.eligible, vendorId: ids.vendor } })).toBe(1);
    await expect(prisma.storeFollow.create({ data: { customerId: ids.eligible, vendorId: ids.vendor } })).rejects.toMatchObject({ code: "P2002" });
    expect(await prisma.storeFollow.count({ where: {
      vendorId: ids.vendor,
      customer: { status: UserStatus.ACTIVE, deletedAt: null, settings: { promotionalInAppNotifications: true, followedStoreAnnouncements: true } },
    } })).toBe(1);

    const publication = await publish("first");
    await FollowerNotificationService.run();

    expect(await prisma.notification.findMany({
      where: { storePublicationEventId: publication.publicationEvent!.id },
      select: { userId: true, actionPath: true },
    })).toEqual([{ userId: ids.eligible, actionPath: `/shops/${marker}` }]);
    expect(await prisma.storePublicationDispatch.findUnique({
      where: { publicationEventId: publication.publicationEvent!.id },
      select: { status: true, processedRecipients: true, createdNotifications: true },
    })).toMatchObject({ status: "DELIVERED", processedRecipients: 1, createdNotifications: 1 });
    expect(await prisma.pushDeliveryOutbox.count({ where: { storePublicationEventId: publication.publicationEvent!.id } })).toBe(0);

    await FollowerNotificationService.run();
    expect(await prisma.notification.count({ where: { storePublicationEventId: publication.publicationEvent!.id } })).toBe(1);

    const concurrent = await publish("concurrent");
    await Promise.all([FollowerNotificationService.run(), FollowerNotificationService.run()]);
    expect(await prisma.notification.count({ where: { storePublicationEventId: concurrent.publicationEvent!.id, userId: ids.eligible } })).toBe(1);
  });

  it("suppresses later publications after unfollowing", async () => {
    await expect(StoreFollowingService.unfollow(ids.eligible, ids.vendor)).resolves.toMatchObject({ following: false });
    const publication = await publish("after-unfollow");
    await FollowerNotificationService.run();
    expect(await prisma.notification.count({ where: { storePublicationEventId: publication.publicationEvent!.id } })).toBe(0);
  });
});
