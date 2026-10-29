import { requireActiveUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { v1Data, v1Error, v1Exception } from "@/lib/api/v1/response";
import { safeNotificationPath } from "@/services/notifications";
import { NotificationType } from "@prisma/client";
import { AnnouncementService } from "@/services/announcements";
import { MarketingNotificationService } from "@/services/marketing-notifications";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireActiveUserId();
    const { id } = await params;
    if (id.startsWith("announcement:")) {
      const value = id.slice(13);
      const { items } = await AnnouncementService.listForUser(userId, { page: 1, pageSize: 200 });
      const item = items.find((candidate) => candidate.id === value);
      return item ? v1Data({ id, source: "ANNOUNCEMENT", eventType: item.presentation === "BANNER" ? "MAINTENANCE" : "SYSTEM", category: item.category, type: item.priority === "CRITICAL" ? NotificationType.ERROR : item.priority === "IMPORTANT" ? NotificationType.WARNING : NotificationType.INFO, title: item.title, body: item.message, actionPath: safeNotificationPath(item.destination), readAt: item.readAt?.toISOString() ?? null, createdAt: (item.publishedAt ?? item.createdAt).toISOString() }) : v1Error("NOT_FOUND", "Notification not found.", 404);
    }
    if (id.startsWith("marketing:")) {
      const value = id.slice(10);
      const { items } = await MarketingNotificationService.listForUser(userId, { page: 1, pageSize: 200 });
      const item = items.find((candidate) => candidate.id === value);
      return item ? v1Data({ id, source: "MARKETING", eventType: "MARKETING", category: "MARKETING", type: NotificationType.INFO, title: item.title, body: item.message, actionPath: safeNotificationPath(item.destinationPath), readAt: item.readAt?.toISOString() ?? null, createdAt: item.deliveredAt.toISOString() }) : v1Error("NOT_FOUND", "Notification not found.", 404);
    }
    const item = await prisma.notification.findFirst({ where: { id, userId, deletedAt: null }, select: { id: true, eventType: true, type: true, title: true, message: true, actionPath: true, readAt: true, createdAt: true } });
    return item ? v1Data({ ...item, source: "PERSONAL", category: item.eventType?.split("_")[0] ?? "SYSTEM", body: item.message, actionPath: safeNotificationPath(item.actionPath), readAt: item.readAt?.toISOString() ?? null, createdAt: item.createdAt.toISOString() }) : v1Error("NOT_FOUND", "Notification not found.", 404);
  } catch (error) { return v1Exception(error); }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireActiveUserId();
    const { id } = await params;
    if (id.startsWith("announcement:")) { await AnnouncementService.dismiss(userId, id.slice(13)); return v1Data({ id, deleted: true }); }
    if (id.startsWith("marketing:")) { await MarketingNotificationService.dismiss(userId, id.slice(10)); return v1Data({ id, deleted: true }); }
    await prisma.notification.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return v1Data({ id, deleted: true });
  } catch (error) {
    return v1Exception(error);
  }
}
