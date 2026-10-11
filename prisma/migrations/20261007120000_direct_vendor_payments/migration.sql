-- Direct-to-vendor payment destinations and transaction records.  Legacy
-- payout/ledger tables are intentionally retained for historical reporting.
CREATE TYPE "PaymentProvider" AS ENUM ('MTN_MOMO', 'AIRTEL_MONEY', 'PESAPAL');
CREATE TYPE "VendorPaymentAccountStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED');
CREATE TYPE "PaymentIntentStatus" AS ENUM ('CREATED', 'PENDING', 'SUCCESSFUL', 'FAILED', 'CANCELLED', 'EXPIRED', 'REVERSED');
CREATE TYPE "PaymentPurpose" AS ENUM ('MARKETPLACE_PURCHASE', 'PLATFORM_SUBSCRIPTION', 'PROMOTION_PURCHASE', 'PREMIUM_FEATURE_PURCHASE');

CREATE TABLE "VendorPaymentAccount" (
  "id" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "merchantCode" TEXT,
  "merchantAccountId" TEXT,
  "merchantName" TEXT,
  "merchantPhoneEncrypted" TEXT,
  "merchantPhoneHash" TEXT,
  "maskedMerchantPhone" TEXT,
  "status" "VendorPaymentAccountStatus" NOT NULL DEFAULT 'PENDING',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "verifiedAt" TIMESTAMP(3), "rejectedAt" TIMESTAMP(3), "suspendedAt" TIMESTAMP(3),
  "verificationNote" TEXT, "createdById" TEXT NOT NULL, "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VendorPaymentAccount_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PaymentIntent" (
  "id" TEXT NOT NULL, "orderId" TEXT NOT NULL, "subOrderId" TEXT NOT NULL, "vendorId" TEXT NOT NULL,
  "vendorPaymentAccountId" TEXT NOT NULL, "provider" "PaymentProvider" NOT NULL,
  "purpose" "PaymentPurpose" NOT NULL DEFAULT 'MARKETPLACE_PURCHASE',
  "amount" DECIMAL(18,2) NOT NULL, "currency" VARCHAR(3) NOT NULL DEFAULT 'UGX',
  "status" "PaymentIntentStatus" NOT NULL DEFAULT 'CREATED', "providerReference" VARCHAR(191),
  "checkoutRequestId" TEXT, "idempotencyKey" TEXT, "failureCode" TEXT, "failureMessage" TEXT,
  "initiatedAt" TIMESTAMP(3), "confirmedAt" TIMESTAMP(3), "failedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PaymentProviderEvent" (
  "id" TEXT NOT NULL, "paymentIntentId" TEXT NOT NULL, "provider" "PaymentProvider" NOT NULL,
  "providerReference" TEXT, "eventType" TEXT NOT NULL, "normalizedStatus" "PaymentIntentStatus",
  "payloadHash" TEXT NOT NULL, "processingResult" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentProviderEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VendorPaymentAccount_vendorId_provider_merchantPhoneHash_key" ON "VendorPaymentAccount"("vendorId", "provider", "merchantPhoneHash");
CREATE INDEX "VendorPaymentAccount_vendorId_status_idx" ON "VendorPaymentAccount"("vendorId", "status");
CREATE INDEX "VendorPaymentAccount_vendorId_isDefault_idx" ON "VendorPaymentAccount"("vendorId", "isDefault");
CREATE UNIQUE INDEX "PaymentIntent_providerReference_key" ON "PaymentIntent"("providerReference");
CREATE UNIQUE INDEX "PaymentIntent_subOrderId_idempotencyKey_key" ON "PaymentIntent"("subOrderId", "idempotencyKey");
CREATE INDEX "PaymentIntent_orderId_status_idx" ON "PaymentIntent"("orderId", "status");
CREATE INDEX "PaymentIntent_vendorId_status_idx" ON "PaymentIntent"("vendorId", "status");
CREATE UNIQUE INDEX "PaymentProviderEvent_provider_payloadHash_key" ON "PaymentProviderEvent"("provider", "payloadHash");
CREATE INDEX "PaymentProviderEvent_paymentIntentId_receivedAt_idx" ON "PaymentProviderEvent"("paymentIntentId", "receivedAt");
ALTER TABLE "VendorPaymentAccount" ADD CONSTRAINT "VendorPaymentAccount_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_subOrderId_fkey" FOREIGN KEY ("subOrderId") REFERENCES "SubOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_vendorPaymentAccountId_fkey" FOREIGN KEY ("vendorPaymentAccountId") REFERENCES "VendorPaymentAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentProviderEvent" ADD CONSTRAINT "PaymentProviderEvent_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "PaymentIntent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
