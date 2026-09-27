-- Immutable currency snapshot for all historical and new orders.
ALTER TABLE "Order" ADD COLUMN "currency" VARCHAR(3) NOT NULL DEFAULT 'UGX';
ALTER TABLE "Order" ALTER COLUMN "currency" DROP DEFAULT;

-- Local payment-attempt lifecycle; no provider communication is introduced here.
CREATE TYPE "PaymentAttemptStatus" AS ENUM ('CREATED', 'SUBMISSION_UNKNOWN', 'INITIATED', 'COMPLETED', 'FAILED', 'REVERSED');

CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "gateway" "PaymentGateway" NOT NULL,
    "merchantReference" VARCHAR(50) NOT NULL,
    "providerTrackingId" VARCHAR(191),
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'CREATED',
    "providerStatus" TEXT,
    "confirmationCode" TEXT,
    "paymentMethod" TEXT,
    "providerPayload" JSONB,
    "initiatedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "reversedAt" TIMESTAMP(3),
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentAttempt_merchantReference_key" ON "PaymentAttempt"("merchantReference");
CREATE UNIQUE INDEX "PaymentAttempt_providerTrackingId_key" ON "PaymentAttempt"("providerTrackingId");
CREATE INDEX "PaymentAttempt_orderId_idx" ON "PaymentAttempt"("orderId");
CREATE INDEX "PaymentAttempt_status_idx" ON "PaymentAttempt"("status");

ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
