import { requireActiveUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { parsePage, v1Exception, v1Paginated } from "@/lib/api/v1/response";
import { safeNotificationPath } from "@/services/notifications";
import { AnnouncementCategory, NotificationType } from "@prisma/client";
import { AnnouncementService } from "@/services/announcements";
import { MarketingNotificationService } from "@/services/marketing-notifications";

export async function GET(request: Request) {
  try {
    const userId = await requireActiveUserId();
    const params = new URL(request.url).searchParams;
    const { page, pageSize } = parsePage(params);
    const read = params.get("status") === "read" ? "read" : params.get("status") === "unread" ? "unread" : undefined;
    const requestedCategory = params.get("category");
    const category = requestedCategory && Object.values(AnnouncementCategory).includes(requestedCategory as AnnouncementCategory) ? requestedCategory as AnnouncementCategory : undefined;
    const includeAnnouncements = requestedCategory !== "MARKETING";
    const includeMarketing = !requestedCategory || requestedCategory === "MARKETING";
    const personalWhere = { userId, deletedAt: null, ...(read === "read" ? { readAt: { not: null } } : read === "unread" ? { readAt: null } : {}), ...(requestedCategory ? { eventType: { startsWith: requestedCategory } } : {}) };
    const take = page * pageSize;
    const [personal, personalTotal, announcementPage, marketingPage, personalUnread, announcementUnread, marketingUnread] = await Promise.all([
      prisma.notification.findMany({ where: personalWhere, orderBy: { createdAt: "desc" }, take, select: { id: true, eventType: true, type: true, title: true, message: true, actionPath: true, readAt: true, createdAt: true } }),
      prisma.notification.count({ where: personalWhere }),
      includeAnnouncements ? AnnouncementService.listForUser(userId, { page: 1, pageSize: take, read, category }) : Promise.resolve({ items: [], total: 0 }),
      includeMarketing ? MarketingNotificationService.listForUser(userId, { page: 1, pageSize: take, read }) : MarketingNotificationService.deliverForUser(userId).then(() => ({ items: [], total: 0 })),
      prisma.notification.count({ where: { userId, deletedAt: null, readAt: null } }),
      AnnouncementService.unreadCount(userId),
      MarketingNotificationService.unreadCount(userId),
    ]);
    const items = [
      ...personal.map((item) => ({ ...item, source: "PERSONAL", category: item.eventType?.split("_")[0] ?? "SYSTEM", body: item.message, actionPath: safeNotificationPath(item.actionPath), readAt: item.readAt?.toISOString() ?? null, createdAt: item.createdAt.toISOString() })),
      ...announcementPage.items.map((item) => ({ id: `announcement:${item.id}`, source: "ANNOUNCEMENT", eventType: item.presentation === "BANNER" ? "MAINTENANCE" : "SYSTEM", category: item.category, type: item.priority === "CRITICAL" ? NotificationType.ERROR : item.priority === "IMPORTANT" ? NotificationType.WARNING : NotificationType.INFO, title: item.title, body: item.message, actionPath: safeNotificationPath(item.destination), readAt: item.readAt?.toISOString() ?? null, createdAt: (item.publishedAt ?? item.createdAt).toISOString() })),
      ...marketingPage.items.map((item) => ({ id: `marketing:${item.id}`, source: "MARKETING", eventType: "MARKETING", category: "MARKETING", type: NotificationType.INFO, title: item.title, body: item.message, actionPath: safeNotificationPath(item.destinationPath), readAt: item.readAt?.toISOString() ?? null, createdAt: item.deliveredAt.toISOString() })),
    ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice((page - 1) * pageSize, page * pageSize);
    const response = await v1Paginated(items, { page, pageSize, total: personalTotal + announcementPage.total + marketingPage.total }).json();
    return Response.json({ ...response, unreadCount: personalUnread + announcementUnread + marketingUnread });
  } catch (error) { return v1Exception(error); }
}
