CREATE TYPE "VendorPayoutAccountProvider" AS ENUM ('MTN_MOBILE_MONEY', 'AIRTEL_MONEY');
CREATE TYPE "VendorPayoutAccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'DISABLED');

CREATE TABLE "VendorPayoutAccount" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "type" "PayoutDestinationType" NOT NULL,
    "provider" "VendorPayoutAccountProvider" NOT NULL,
    "accountHolderName" TEXT NOT NULL,
    "accountReferenceEncrypted" TEXT NOT NULL,
    "accountReferenceHash" TEXT NOT NULL,
    "maskedReference" TEXT NOT NULL,
    "status" "VendorPayoutAccountStatus" NOT NULL DEFAULT 'PENDING',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VendorPayoutAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VendorPayoutAccount_vendorId_accountReferenceHash_key" ON "VendorPayoutAccount"("vendorId", "accountReferenceHash");
CREATE INDEX "VendorPayoutAccount_vendorId_status_idx" ON "VendorPayoutAccount"("vendorId", "status");
CREATE INDEX "VendorPayoutAccount_vendorId_isDefault_idx" ON "VendorPayoutAccount"("vendorId", "isDefault");
CREATE UNIQUE INDEX "VendorPayoutAccount_one_default_per_vendor" ON "VendorPayoutAccount"("vendorId") WHERE "isDefault" = true;

ALTER TABLE "VendorPayoutAccount" ADD CONSTRAINT "VendorPayoutAccount_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VendorPayout" ADD COLUMN "payoutAccountId" TEXT;
CREATE INDEX "VendorPayout_payoutAccountId_idx" ON "VendorPayout"("payoutAccountId");
ALTER TABLE "VendorPayout" ADD CONSTRAINT "VendorPayout_payoutAccountId_fkey" FOREIGN KEY ("payoutAccountId") REFERENCES "VendorPayoutAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
