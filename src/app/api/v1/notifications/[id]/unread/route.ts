import { requireActiveUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { v1Data, v1Error, v1Exception } from "@/lib/api/v1/response";
import { AnnouncementService } from "@/services/announcements";
import { MarketingNotificationService } from "@/services/marketing-notifications";

export async function PATCH(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireActiveUserId();
    const { id } = await params;
    if (id.startsWith("announcement:")) { await AnnouncementService.setRead(userId, id.slice(13), false); return v1Data({ id, read: false }); }
    if (id.startsWith("marketing:")) { await MarketingNotificationService.setRead(userId, id.slice(10), false); return v1Data({ id, read: false }); }
    const result = await prisma.notification.updateMany({
      where: { id, userId, deletedAt: null },
      data: { readAt: null },
    });
    return result.count
      ? v1Data({ id, read: false })
      : v1Error("NOT_FOUND", "Notification not found.", 404);
  } catch (error) {
    return v1Exception(error);
  }
}
