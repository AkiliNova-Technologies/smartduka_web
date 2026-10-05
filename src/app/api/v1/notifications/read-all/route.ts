import { requireActiveUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
export async function POST() { try { const result = await prisma.notification.updateMany({ where: { userId: await requireActiveUserId(), readAt: null }, data: { readAt: new Date() } }); return v1Data({ updated: result.count }); } catch (error) { return v1Exception(error); } }
