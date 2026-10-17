CREATE TYPE "AnnouncementStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'CANCELLED', 'EXPIRED');
CREATE TYPE "AnnouncementCategory" AS ENUM ('GENERAL', 'OPERATIONS', 'SECURITY', 'POLICY', 'PRODUCT');
CREATE TYPE "AnnouncementPriority" AS ENUM ('NORMAL', 'IMPORTANT', 'CRITICAL');
CREATE TYPE "AnnouncementAudience" AS ENUM ('ALL', 'CUSTOMERS', 'VENDORS', 'ADMINISTRATORS');
CREATE TYPE "AnnouncementPresentation" AS ENUM ('NOTIFICATION', 'BANNER');

CREATE TABLE "Announcement" (
  "id" TEXT NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "message" VARCHAR(2000) NOT NULL,
  "category" "AnnouncementCategory" NOT NULL DEFAULT 'GENERAL',
  "priority" "AnnouncementPriority" NOT NULL DEFAULT 'NORMAL',
  "audience" "AnnouncementAudience" NOT NULL,
  "presentation" "AnnouncementPresentation" NOT NULL DEFAULT 'NOTIFICATION',
  "destination" VARCHAR(500),
  "status" "AnnouncementStatus" NOT NULL DEFAULT 'DRAFT',
  "scheduledAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "publishedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnnouncementUserState" (
  "id" TEXT NOT NULL,
  "announcementId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "dismissedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AnnouncementUserState_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Announcement_status_scheduledAt_idx" ON "Announcement"("status", "scheduledAt");
CREATE INDEX "Announcement_status_publishedAt_idx" ON "Announcement"("status", "publishedAt");
CREATE INDEX "Announcement_audience_status_publishedAt_idx" ON "Announcement"("audience", "status", "publishedAt");
CREATE INDEX "Announcement_presentation_status_expiresAt_idx" ON "Announcement"("presentation", "status", "expiresAt");
CREATE UNIQUE INDEX "AnnouncementUserState_announcementId_userId_key" ON "AnnouncementUserState"("announcementId", "userId");
CREATE INDEX "AnnouncementUserState_userId_readAt_idx" ON "AnnouncementUserState"("userId", "readAt");
CREATE INDEX "AnnouncementUserState_userId_dismissedAt_idx" ON "AnnouncementUserState"("userId", "dismissedAt");

ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnnouncementUserState" ADD CONSTRAINT "AnnouncementUserState_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnnouncementUserState" ADD CONSTRAINT "AnnouncementUserState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
