ALTER TABLE "Notification" ADD COLUMN "idempotencyKey" VARCHAR(191);
CREATE UNIQUE INDEX "Notification_idempotencyKey_key" ON "Notification"("idempotencyKey");
