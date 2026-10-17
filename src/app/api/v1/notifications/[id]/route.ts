import { requireActiveUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
import { AnnouncementService } from "@/services/announcements";
import { MarketingNotificationService } from "@/services/marketing-notifications";

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
