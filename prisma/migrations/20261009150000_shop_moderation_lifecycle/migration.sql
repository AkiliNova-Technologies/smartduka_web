-- BANNED is additive: existing ACTIVE, PENDING, SUSPENDED, and CANCELLED rows
-- retain their meaning and no rejected application is guessed to be suspended.
ALTER TYPE "VendorStatus" ADD VALUE IF NOT EXISTS 'BANNED';

ALTER TABLE "VendorProfile"
  ADD COLUMN IF NOT EXISTS "bannedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "moderationReason" TEXT;
