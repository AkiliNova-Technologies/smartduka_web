import { prisma } from "@/lib/prisma/client";
import { requireActiveUserId } from "@/lib/auth/session";
import { createHash } from "node:crypto";
import { encryptPushSubscriptionValue } from "@/lib/web-push-config";

const dto = { id: true, deviceId: true, platform: true, appVersion: true, deviceName: true, enabled: true, lastSeenAt: true, createdAt: true } as const;
export class UserDeviceService {
  static async list() { return prisma.userDevice.findMany({ where: { userId: await requireActiveUserId() }, select: dto, orderBy: { lastSeenAt: "desc" }, take: 50 }); }
  static async register(input: { deviceId: string; platform: "IOS" | "ANDROID"; pushToken: string; appVersion?: string; deviceName?: string }) {
    const userId = await requireActiveUserId();
    const pushTokenHash = createHash("sha256").update(input.pushToken).digest("hex");
    const pushTokenEncrypted = encryptPushSubscriptionValue(input.pushToken);
    await prisma.userDevice.deleteMany({ where: { userId: { not: userId }, OR: [{ pushTokenHash }, { deviceId: input.deviceId }] } });
    return prisma.userDevice.upsert({ where: { userId_deviceId: { userId, deviceId: input.deviceId } }, create: { userId, deviceId: input.deviceId, platform: input.platform, pushTokenHash, pushTokenEncrypted, appVersion: input.appVersion, deviceName: input.deviceName, enabled: true }, update: { platform: input.platform, pushTokenHash, pushTokenEncrypted, appVersion: input.appVersion, deviceName: input.deviceName, enabled: true, lastSeenAt: new Date(), tokenUpdatedAt: new Date(), registrationVersion: { increment: 1 }, failureCount: 0 }, select: dto });
  }
  static async remove(id: string) { const userId = await requireActiveUserId(); const result = await prisma.userDevice.deleteMany({ where: { id, userId } }); if (!result.count) { const error = new Error("Device not found."); Object.assign(error, { code: "NOT_FOUND" }); throw error; } }
}
