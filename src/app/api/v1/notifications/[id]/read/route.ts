import { requireActiveUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { v1Data, v1Error, v1Exception } from "@/lib/api/v1/response";
export async function PATCH(_: Request, { params }: { params: Promise<{ id: string }> }) { try { const userId = await requireActiveUserId(); const { id } = await params; const result = await prisma.notification.updateMany({ where: { id, userId }, data: { readAt: new Date() } }); return result.count ? v1Data({ id, read: true }) : v1Error("NOT_FOUND", "Notification not found.", 404); } catch (error) { return v1Exception(error); } }
