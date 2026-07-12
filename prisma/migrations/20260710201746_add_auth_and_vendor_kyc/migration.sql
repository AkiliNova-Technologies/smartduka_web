-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PlatformRole" ADD VALUE 'VENDOR';
ALTER TYPE "PlatformRole" ADD VALUE 'CUSTOMER';

-- AlterTable
ALTER TABLE "Document" ALTER COLUMN "vendorId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "VendorApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "storeSlug" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "taxId" TEXT,
    "businessEmail" TEXT NOT NULL,
    "businessPhone" TEXT NOT NULL,
    "website" TEXT,
    "streetAddress" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Kampala',
    "district" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Uganda',
    "postalCode" TEXT,
    "productCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expectedMonthlyVolume" TEXT,
    "hasPhysicalStore" BOOLEAN NOT NULL DEFAULT false,
    "storeLocation" TEXT,
    "momoNetwork" TEXT,
    "momoNumber" TEXT,
    "bankName" TEXT,
    "bankAccountName" TEXT,
    "bankAccountNumber" TEXT,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewerNotes" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "vendorProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorDocument" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_sessionToken_idx" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "VendorApplication_storeSlug_key" ON "VendorApplication"("storeSlug");

-- CreateIndex
CREATE UNIQUE INDEX "VendorApplication_vendorProfileId_key" ON "VendorApplication"("vendorProfileId");

-- CreateIndex
CREATE INDEX "VendorApplication_status_idx" ON "VendorApplication"("status");

-- CreateIndex
CREATE INDEX "VendorApplication_storeSlug_idx" ON "VendorApplication"("storeSlug");

-- CreateIndex
CREATE UNIQUE INDEX "VendorApplication_userId_key" ON "VendorApplication"("userId");

-- CreateIndex
CREATE INDEX "VendorDocument_applicationId_idx" ON "VendorDocument"("applicationId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorApplication" ADD CONSTRAINT "VendorApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorApplication" ADD CONSTRAINT "VendorApplication_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "VendorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDocument" ADD CONSTRAINT "VendorDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "VendorApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
