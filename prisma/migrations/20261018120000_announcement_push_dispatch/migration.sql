CREATE TYPE "AnnouncementContentClass" AS ENUM ('ESSENTIAL', 'PROMOTIONAL');
CREATE TYPE "AnnouncementPushDispatchStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'EXPIRED');

ALTER TABLE "Announcement"
  ADD COLUMN "contentClass" "AnnouncementContentClass" NOT NULL DEFAULT 'ESSENTIAL',
  ADD COLUMN "pushEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "PushDeliveryOutbox" ADD COLUMN "announcementId" TEXT;

CREATE TABLE "AnnouncementPushDispatch" (
  "id" TEXT NOT NULL,
  "announcementId" TEXT NOT NULL,
  "status" "AnnouncementPushDispatchStatus" NOT NULL DEFAULT 'PENDING',
  "cursorUserId" TEXT,
  "processedRecipients" INTEGER NOT NULL DEFAULT 0,
  "queuedRecipients" INTEGER NOT NULL DEFAULT 0,
  "lockedAt" TIMESTAMP(3),
  "lockToken" VARCHAR(80),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AnnouncementPushDispatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AnnouncementPushDispatch_announcementId_key" ON "AnnouncementPushDispatch"("announcementId");
CREATE INDEX "AnnouncementPushDispatch_status_updatedAt_idx" ON "AnnouncementPushDispatch"("status", "updatedAt");
CREATE UNIQUE INDEX "PushDeliveryOutbox_announcementId_userId_key" ON "PushDeliveryOutbox"("announcementId", "userId");

ALTER TABLE "AnnouncementPushDispatch" ADD CONSTRAINT "AnnouncementPushDispatch_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PushDeliveryOutbox" ADD CONSTRAINT "PushDeliveryOutbox_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
