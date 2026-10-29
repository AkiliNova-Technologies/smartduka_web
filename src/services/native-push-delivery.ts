import { PushDeliveryStatus, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { adminMessaging } from "@/lib/firebase/admin";
import { decryptPushSubscriptionValue } from "@/lib/web-push-config";

const transientCodes = new Set([
  "messaging/internal-error",
  "messaging/server-unavailable",
  "messaging/unknown-error",
]);
const invalidCodes = new Set([
  "messaging/installation-id-not-registered",
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
  "messaging/mismatched-credential",
]);

export function nativePushEnabled() {
  return process.env.NATIVE_PUSH_ENABLED === "true";
}

function codeOf(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) return "messaging/unknown-error";
  return String(error.code).slice(0, 120);
}

export class NativePushDeliveryService {
  static async deliver(job: {
    id: string;
    userId: string;
    notificationId: string | null;
    announcementId?: string | null;
    marketingCampaignId?: string | null;
    kind: string;
    title: string;
    message: string;
    actionPath: string | null;
    notification?: { eventType: string | null } | null;
  }) {
    if (!nativePushEnabled()) return { delivered: 0, transient: false };
    const notificationId = job.notificationId ?? (job.announcementId ? `announcement:${job.announcementId}` : job.marketingCampaignId ? `marketing:${job.marketingCampaignId}` : null);
    if (!notificationId) return { delivered: 0, transient: false };
    const devices = await prisma.userDevice.findMany({
      where: { userId: job.userId, enabled: true, platform: "ANDROID", user: { status: UserStatus.ACTIVE, deletedAt: null } },
      select: { id: true, pushTokenEncrypted: true },
    });
    if (!devices.length) return { delivered: 0, transient: false };
    await prisma.nativePushDelivery.createMany({
      data: devices.map((device) => ({ outboxId: job.id, deviceId: device.id })),
      skipDuplicates: true,
    });
    let delivered = 0;
    let transient = false;
    for (const device of devices) {
      const claim = await prisma.nativePushDelivery.updateMany({
        where: { outboxId: job.id, deviceId: device.id, status: { in: [PushDeliveryStatus.PENDING, PushDeliveryStatus.RETRYING] } },
        data: { status: PushDeliveryStatus.PROCESSING, attempts: { increment: 1 } },
      });
      if (!claim.count) continue;
      try {
        const event = job.notification?.eventType ?? "";
        const channelId = job.kind === "MARKETING" ? "mwezora_offers" : event.startsWith("ORDER_") ? "mwezora_orders" : event.startsWith("PAYMENT_") ? "mwezora_payments" : "mwezora_account";
        await adminMessaging.send({
          fid: decryptPushSubscriptionValue(device.pushTokenEncrypted),
          notification: { title: job.title, body: job.message },
          data: {
            version: "1",
            notificationId,
            source: job.announcementId ? "ANNOUNCEMENT" : job.marketingCampaignId ? "MARKETING" : "PERSONAL",
            title: job.title,
            body: job.message.slice(0, 240),
            ...(job.notification?.eventType ? { eventType: job.notification.eventType } : {}),
          },
          android: {
            priority: job.kind === "MARKETING" ? "normal" : "high",
            notification: { channelId, tag: `mwezora:${job.id}` },
          },
        });
        delivered++;
        await prisma.$transaction([
          prisma.nativePushDelivery.updateMany({ where: { outboxId: job.id, deviceId: device.id, status: PushDeliveryStatus.PROCESSING }, data: { status: PushDeliveryStatus.DELIVERED, deliveredAt: new Date(), failureCode: null } }),
          prisma.userDevice.update({ where: { id: device.id }, data: { lastSuccessAt: new Date(), failureCount: 0 } }),
        ]);
      } catch (error) {
        const code = codeOf(error);
        const invalid = invalidCodes.has(code);
        transient ||= transientCodes.has(code);
        await prisma.$transaction([
          prisma.nativePushDelivery.updateMany({ where: { outboxId: job.id, deviceId: device.id, status: PushDeliveryStatus.PROCESSING }, data: { status: invalid ? PushDeliveryStatus.FAILED : PushDeliveryStatus.RETRYING, failureCode: code, lastFailureAt: new Date() } }),
          prisma.userDevice.update({ where: { id: device.id }, data: { enabled: invalid ? false : undefined, lastFailureAt: new Date(), failureCount: { increment: 1 } } }),
        ]);
      }
    }
    return { delivered, transient };
  }
}
