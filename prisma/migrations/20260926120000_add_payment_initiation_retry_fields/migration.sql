ALTER TABLE "PaymentAttempt" ADD COLUMN "initiationRequestId" VARCHAR(128), ADD COLUMN "redirectUrl" TEXT;
CREATE UNIQUE INDEX "PaymentAttempt_initiationRequestId_key" ON "PaymentAttempt"("initiationRequestId");
