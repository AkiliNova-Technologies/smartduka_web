CREATE TYPE "DevicePlatform" AS ENUM ('IOS', 'ANDROID');
CREATE TABLE "UserDevice" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "deviceId" TEXT NOT NULL, "platform" "DevicePlatform" NOT NULL, "pushToken" TEXT NOT NULL, "appVersion" TEXT, "deviceName" TEXT, "enabled" BOOLEAN NOT NULL DEFAULT true, "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "UserDevice_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "UserDevice_pushToken_key" ON "UserDevice"("pushToken");
CREATE UNIQUE INDEX "UserDevice_userId_deviceId_key" ON "UserDevice"("userId", "deviceId");
CREATE INDEX "UserDevice_userId_enabled_idx" ON "UserDevice"("userId", "enabled");
ALTER TABLE "UserDevice" ADD CONSTRAINT "UserDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
