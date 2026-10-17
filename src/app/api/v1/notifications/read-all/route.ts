import { requireActiveUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
import { AnnouncementService } from "@/services/announcements";
import { MarketingNotificationService } from "@/services/marketing-notifications";
export async function POST() { try { const userId = await requireActiveUserId(); const [result, announcements, marketing] = await Promise.all([prisma.notification.updateMany({ where: { userId, deletedAt: null, readAt: null }, data: { readAt: new Date() } }), AnnouncementService.markAllRead(userId), MarketingNotificationService.markAllRead(userId)]); return v1Data({ updated: result.count + announcements + marketing }); } catch (error) { return v1Exception(error); } }
