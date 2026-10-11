ALTER TYPE "PlatformPaymentIntentStatus" ADD VALUE IF NOT EXISTS 'CREATED';
ALTER TYPE "PromotionCreditLedgerType" ADD VALUE IF NOT EXISTS 'RELEASE';
ALTER TABLE "PlatformPaymentIntent" ADD COLUMN IF NOT EXISTS "reconcileAttempts" INTEGER NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS "lastReconciledAt" TIMESTAMP(3), ADD COLUMN IF NOT EXISTS "nextReconcileAt" TIMESTAMP(3), ADD COLUMN IF NOT EXISTS "lastReconcileError" TEXT;
ALTER TABLE "PromotionCreditLedger" ADD COLUMN IF NOT EXISTS "releaseKey" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "PromotionCreditLedger_releaseKey_key" ON "PromotionCreditLedger"("releaseKey");
