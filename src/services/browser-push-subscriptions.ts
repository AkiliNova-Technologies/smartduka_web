import { BrowserPushSubscriptionStatus } from "@prisma/client";
import { requireActiveUserId } from "@/lib/auth/session";
import { decryptPushSubscriptionValue, encryptPushSubscriptionValue, getWebPushConfiguration, hashPushEndpoint } from "@/lib/web-push-config";
import type { BrowserPushSubscriptionInput } from "@/lib/push-subscription-schema";
import { prisma } from "@/lib/prisma/client";

export class BrowserPushSubscriptionError extends Error {
  constructor(message: string, public code = "VALIDATION_ERROR") { super(message); }
}

const statusSelect = {
  id: true, status: true, createdAt: true, lastSuccessAt: true, lastFailureAt: true,
} as const;

function configured() {
  if (!getWebPushConfiguration()) throw new BrowserPushSubscriptionError("Push notifications are not configured for this environment.", "UNAVAILABLE");
}

export class BrowserPushSubscriptionService {
  static async status(endpoint?: string) {
    const userId = await requireActiveUserId();
    const active = await prisma.browserPushSubscription.findFirst({
      where: {
        userId,
        status: BrowserPushSubscriptionStatus.ACTIVE,
        ...(endpoint ? { endpointHash: hashPushEndpoint(endpoint) } : {}),
      },
      select: statusSelect,
      orderBy: { updatedAt: "desc" },
    });
    return { configured: !!getWebPushConfiguration(), subscribed: !!active, subscription: active };
  }

  /** Explicit enablement is the only path that can claim a revoked endpoint for a new account. */
  static async register(input: BrowserPushSubscriptionInput, userAgent: string | null) {
    configured();
    const userId = await requireActiveUserId();
    const endpointHash = hashPushEndpoint(input.endpoint);
    const existing = await prisma.browserPushSubscription.findUnique({ where: { endpointHash }, select: { id: true, userId: true, status: true } });
    if (existing && existing.userId !== userId && existing.status === BrowserPushSubscriptionStatus.ACTIVE) {
      throw new BrowserPushSubscriptionError("This browser is already enabled for another Mwezora account. Sign out there or disable notifications before enabling them here.", "OWNERSHIP_CONFLICT");
    }
    const data = {
      userId,
      endpointEncrypted: encryptPushSubscriptionValue(input.endpoint),
      p256dhEncrypted: encryptPushSubscriptionValue(input.keys.p256dh),
      authEncrypted: encryptPushSubscriptionValue(input.keys.auth),
      userAgent: userAgent?.slice(0, 512) || null,
      deviceName: input.deviceName?.trim() || null,
      status: BrowserPushSubscriptionStatus.ACTIVE,
      revokedAt: null,
      failureCount: 0,
      lastFailureAt: null,
    };
    const subscription = existing
      ? await prisma.browserPushSubscription.update({ where: { endpointHash }, data: { ...data, registrationVersion: { increment: 1 } }, select: statusSelect })
      : await prisma.browserPushSubscription.create({ data: { endpointHash, ...data }, select: statusSelect });
    await prisma.auditLog.create({ data: { userId, action: "BROWSER_PUSH_SUBSCRIPTION_ENABLED", entity: "BrowserPushSubscription", entityId: subscription.id } });
    return { configured: true, subscribed: true, subscription };
  }

  static async remove(endpoint?: string) {
    const userId = await requireActiveUserId();
    const where = endpoint ? { userId, endpointHash: hashPushEndpoint(endpoint), status: BrowserPushSubscriptionStatus.ACTIVE } : { userId, status: BrowserPushSubscriptionStatus.ACTIVE };
    const result = await prisma.browserPushSubscription.updateMany({ where, data: { status: BrowserPushSubscriptionStatus.REVOKED, revokedAt: new Date(), registrationVersion: { increment: 1 } } });
    if (result.count) await prisma.auditLog.create({ data: { userId, action: "BROWSER_PUSH_SUBSCRIPTION_REVOKED", entity: "BrowserPushSubscription", newValues: { count: result.count } } });
    return { removed: result.count > 0 };
  }

  static decode(subscription: { endpointEncrypted: string; p256dhEncrypted: string; authEncrypted: string }) {
    return { endpoint: decryptPushSubscriptionValue(subscription.endpointEncrypted), keys: { p256dh: decryptPushSubscriptionValue(subscription.p256dhEncrypted), auth: decryptPushSubscriptionValue(subscription.authEncrypted) } };
  }
}
