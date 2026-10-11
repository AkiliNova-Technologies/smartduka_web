ALTER TABLE "PaymentIntent" ADD COLUMN "lastReconciledAt" TIMESTAMP(3), ADD COLUMN "nextReconcileAt" TIMESTAMP(3), ADD COLUMN "reconcileAttempts" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "lastReconcileError" TEXT;
ALTER TABLE "PaymentProviderEvent" ADD COLUMN "providerEventId" TEXT, ADD COLUMN "processedAt" TIMESTAMP(3), ADD COLUMN "failureReason" TEXT;
CREATE UNIQUE INDEX "PaymentProviderEvent_provider_providerEventId_key" ON "PaymentProviderEvent"("provider", "providerEventId");
CREATE INDEX "PaymentIntent_status_nextReconcileAt_idx" ON "PaymentIntent"("status", "nextReconcileAt");
