import { prisma } from "@/lib/prisma/client";
import { requireActiveUserId } from "@/lib/auth/session";

const dto = { id: true, deviceId: true, platform: true, appVersion: true, deviceName: true, enabled: true, lastSeenAt: true, createdAt: true } as const;
export class UserDeviceService {
  static async list() { return prisma.userDevice.findMany({ where: { userId: await requireActiveUserId() }, select: dto, orderBy: { lastSeenAt: "desc" }, take: 50 }); }
  static async register(input: { deviceId: string; platform: "IOS" | "ANDROID"; pushToken: string; appVersion?: string; deviceName?: string }) {
    const userId = await requireActiveUserId();
    await prisma.userDevice.deleteMany({ where: { pushToken: input.pushToken, userId: { not: userId } } });
    return prisma.userDevice.upsert({ where: { userId_deviceId: { userId, deviceId: input.deviceId } }, create: { userId, ...input, enabled: true }, update: { ...input, enabled: true, lastSeenAt: new Date() }, select: dto });
  }
  static async remove(id: string) { const userId = await requireActiveUserId(); const result = await prisma.userDevice.deleteMany({ where: { id, userId } }); if (!result.count) { const error = new Error("Device not found."); Object.assign(error, { code: "NOT_FOUND" }); throw error; } }
}
