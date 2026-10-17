ALTER TABLE "Notification"
ADD COLUMN "eventType" VARCHAR(80),
ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "Notification_userId_deletedAt_createdAt_idx"
ON "Notification"("userId", "deletedAt", "createdAt");
