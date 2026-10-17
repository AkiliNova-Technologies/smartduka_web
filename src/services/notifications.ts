import { NotificationType, Prisma, UserStatus, VendorUserRole } from "@prisma/client";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma/client";
import { PushDeliveryOutboxService } from "@/services/push-delivery-outbox";

type NotificationDb = {
  notification: { upsert: (args: Prisma.NotificationUpsertArgs) => Promise<{ id: string }> };
  user: { findMany: (args: Prisma.UserFindManyArgs) => Promise<Array<{ id: string; vendorRole: VendorUserRole | null }>> };
  pushDeliveryOutbox?: Prisma.TransactionClient["pushDeliveryOutbox"];
};

export type NotificationBusinessEvent =
  | "ORDER_CREATED"
  | "ORDER_RECEIVED"
  | "ORDER_PROCESSING"
  | "ORDER_CANCELLED"
  | "ORDER_DISPATCHED"
  | "ORDER_READY_FOR_PICKUP"
  | "ORDER_DELIVERED"
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_FAILED"
  | "PAYMENT_REVERSED"
  | "VERIFICATION_SUBMITTED"
  | "VERIFICATION_ASSIGNED"
  | "VERIFICATION_INFORMATION_PROVIDED"
  | "VERIFICATION_UNDER_REVIEW"
  | "VERIFICATION_INFORMATION_REQUIRED"
  | "VERIFICATION_APPROVED"
  | "VERIFICATION_REJECTED"
  | "VERIFICATION_SUSPENDED"
  | "VERIFICATION_RESTORED"
  | "VERIFICATION_REVOKED"
  | "PAYOUT_UPDATED"
  | "SUBSCRIPTION_UPDATED"
  | "ADVERTISING"
  | "MARKETING"
  | "SECURITY"
  | "MAINTENANCE"
  | "SYSTEM";

export interface CreateNotificationInput {
  event: NotificationBusinessEvent;
  idempotencyKey: string;
  userId: string;
  vendorId?: string | null;
  type?: NotificationType;
  title: string;
  message: string;
  actionPath?: string | null;
}

const INTERNAL_PATH = /^\/(?!\/)[A-Za-z0-9/_?=&.%-]*$/;
const PUSH_EVENTS = new Set<NotificationBusinessEvent>([
  "ORDER_CREATED", "ORDER_RECEIVED", "ORDER_PROCESSING", "ORDER_CANCELLED", "ORDER_DISPATCHED", "ORDER_READY_FOR_PICKUP", "ORDER_DELIVERED", "PAYMENT_CONFIRMED", "VERIFICATION_SUBMITTED", "VERIFICATION_ASSIGNED", "VERIFICATION_UNDER_REVIEW", "VERIFICATION_APPROVED", "VERIFICATION_REJECTED", "SUBSCRIPTION_UPDATED",
]);

const TRANSACTIONAL_PUSH_COPY: Partial<Record<NotificationBusinessEvent, { title: string; message: string }>> = {
  ORDER_CREATED: { title: "Order confirmed", message: "Your order has been placed." },
  ORDER_RECEIVED: { title: "New order received", message: "You have a new order waiting for your review." },
  ORDER_PROCESSING: { title: "Order accepted", message: "Your order is being prepared." },
  ORDER_CANCELLED: { title: "Order cancelled", message: "An order update requires your attention." },
  ORDER_DISPATCHED: { title: "Your order is on its way", message: "Your order has been dispatched." },
  ORDER_READY_FOR_PICKUP: { title: "Order ready for pickup", message: "Your order is ready for collection." },
  ORDER_DELIVERED: { title: "Order delivered", message: "Your order has been delivered." },
  PAYMENT_CONFIRMED: { title: "Payment confirmed", message: "A payment update is ready to review." },
  VERIFICATION_SUBMITTED: { title: "Verification received", message: "A shop verification update is ready to review." },
  VERIFICATION_ASSIGNED: { title: "Verification assigned", message: "A shop verification needs your review." },
  VERIFICATION_UNDER_REVIEW: { title: "Verification under review", message: "Your shop verification is under review." },
  VERIFICATION_APPROVED: { title: "Your verification is approved", message: "Your shop verification has been approved." },
  VERIFICATION_REJECTED: { title: "Verification update", message: "Your shop verification requires your attention." },
  SUBSCRIPTION_UPDATED: { title: "Subscription update", message: "Your shop subscription has been updated." },
};

export function safeNotificationPath(value?: string | null): string | null {
  if (!value) return null;
  const path = value.trim();
  return path.length <= 500 && INTERNAL_PATH.test(path) ? path : null;
}

function safeText(value: string, max: number) {
  return value.trim().replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").slice(0, max);
}

/** Lock-screen-safe copy. The in-app notification retains its full approved text. */
export function transactionalPushContent(event: NotificationBusinessEvent, title: string, message: string) {
  if (!PUSH_EVENTS.has(event)) return null;
  return TRANSACTIONAL_PUSH_COPY[event] ?? { title: safeText(title, 160), message: safeText(message, 1000) };
}

export class NotificationService {
  static async create(input: CreateNotificationInput, database: unknown = prisma): Promise<{ id: string }> {
    if (database === prisma) return prisma.$transaction((tx) => this.create(input, tx));
    const db = database as NotificationDb;
    const title = safeText(input.title, 160);
    const message = safeText(input.message, 1000);
    if (!title || !message) throw new Error("Notification title and message are required.");
    const notification = await db.notification.upsert({
      where: { idempotencyKey: input.idempotencyKey },
      update: {},
      create: {
        idempotencyKey: input.idempotencyKey,
        userId: input.userId,
        vendorId: input.vendorId ?? null,
        type: input.type ?? NotificationType.INFO,
        eventType: input.event,
        title,
        message,
        actionPath: safeNotificationPath(input.actionPath),
      },
      select: { id: true },
    });
    const push = transactionalPushContent(input.event, title, message);
    if (db.pushDeliveryOutbox && push) {
      await PushDeliveryOutboxService.enqueueTransactional({ notificationId: notification.id, idempotencyKey: input.idempotencyKey, userId: input.userId, title: push.title, message: push.message, actionPath: input.actionPath }, db as Required<Pick<NotificationDb, "pushDeliveryOutbox">>);
    }
    return notification;
  }

  static async vendorOrderRecipients(vendorId: string, ownerUserId: string, database: unknown = prisma) {
    const db = database as NotificationDb;
    const users = await db.user.findMany({
      where: { vendorId, status: UserStatus.ACTIVE, vendorRole: { not: null } },
      select: { id: true, vendorRole: true },
    });
    return [...new Set([{ id: ownerUserId, vendorRole: "OWNER" as const }, ...users]
      .filter((user) => user.vendorRole && hasPermission({ vendorRole: user.vendorRole }, "vendor:view_orders"))
      .map((user) => user.id))];
  }

  static async createForVendorOrder(
    input: Omit<CreateNotificationInput, "userId"> & { vendorId: string; ownerUserId: string },
    database: unknown = prisma,
  ) {
    const recipients = await this.vendorOrderRecipients(input.vendorId, input.ownerUserId, database);
    await Promise.all(recipients.map((userId) => this.create({
      ...input,
      userId,
      idempotencyKey: `${input.idempotencyKey}:${userId}`,
    }, database)));
    return recipients;
  }
}
