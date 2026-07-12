-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT,
    "phoneNumber" TEXT,
    "avatarUrl" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'UGX',
    "primaryLanguage" TEXT NOT NULL DEFAULT 'en',
    "deliveryDistrict" TEXT,
    "momoNetwork" TEXT,
    "momoNumber" TEXT,
    "orderAlertsEmail" BOOLEAN NOT NULL DEFAULT true,
    "orderAlertsPush" BOOLEAN NOT NULL DEFAULT true,
    "securityAlertsSMS" BOOLEAN NOT NULL DEFAULT true,
    "marketingNewsletter" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "buyerProtectionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE INDEX "UserSettings_userId_idx" ON "UserSettings"("userId");

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
