-- Shop trust verification is intentionally distinct from VendorApplication
-- onboarding/KYC approval. The status cache supports safe public reads.
CREATE TYPE "ShopVerificationStatus" AS ENUM ('NOT_APPLIED', 'PENDING', 'UNDER_REVIEW', 'NEEDS_INFORMATION', 'VERIFIED', 'REJECTED', 'SUSPENDED', 'REVOKED');
CREATE TYPE "ShopVerificationActivityType" AS ENUM ('APPLICATION_SUBMITTED', 'REVIEW_STARTED', 'ASSIGNED', 'REASSIGNED', 'INFORMATION_REQUESTED', 'INFORMATION_PROVIDED', 'APPROVED', 'REJECTED', 'SUSPENDED', 'REINSTATED', 'REVOKED', 'INTERNAL_NOTE_ADDED');

ALTER TABLE "VendorProfile"
  ADD COLUMN "verificationStatus" "ShopVerificationStatus" NOT NULL DEFAULT 'NOT_APPLIED',
  ADD COLUMN "verifiedAt" TIMESTAMP(3);

CREATE TABLE "ShopVerificationApplication" (
  "id" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "submittedById" TEXT NOT NULL,
  "status" "ShopVerificationStatus" NOT NULL DEFAULT 'PENDING',
  "snapshot" JSONB NOT NULL,
  "vendorResponse" TEXT,
  "informationRequest" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewStartedAt" TIMESTAMP(3),
  "assignedAdminId" TEXT,
  "assignedById" TEXT,
  "assignedAt" TIMESTAMP(3),
  "decisionById" TEXT,
  "decidedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "suspensionReason" TEXT,
  "revocationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShopVerificationApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShopVerificationActivity" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "actorId" TEXT,
  "type" "ShopVerificationActivityType" NOT NULL,
  "fromValue" TEXT,
  "toValue" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShopVerificationActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShopVerificationNote" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShopVerificationNote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopVerificationApplication_publicId_key" ON "ShopVerificationApplication"("publicId");
CREATE INDEX "ShopVerificationApplication_vendorId_status_idx" ON "ShopVerificationApplication"("vendorId", "status");
CREATE INDEX "ShopVerificationApplication_status_submittedAt_idx" ON "ShopVerificationApplication"("status", "submittedAt");
CREATE INDEX "ShopVerificationApplication_assignedAdminId_status_idx" ON "ShopVerificationApplication"("assignedAdminId", "status");
CREATE INDEX "ShopVerificationActivity_applicationId_createdAt_idx" ON "ShopVerificationActivity"("applicationId", "createdAt");
CREATE INDEX "ShopVerificationNote_applicationId_createdAt_idx" ON "ShopVerificationNote"("applicationId", "createdAt");

ALTER TABLE "ShopVerificationApplication" ADD CONSTRAINT "ShopVerificationApplication_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopVerificationApplication" ADD CONSTRAINT "ShopVerificationApplication_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShopVerificationApplication" ADD CONSTRAINT "ShopVerificationApplication_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ShopVerificationApplication" ADD CONSTRAINT "ShopVerificationApplication_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ShopVerificationApplication" ADD CONSTRAINT "ShopVerificationApplication_decisionById_fkey" FOREIGN KEY ("decisionById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ShopVerificationActivity" ADD CONSTRAINT "ShopVerificationActivity_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "ShopVerificationApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopVerificationActivity" ADD CONSTRAINT "ShopVerificationActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ShopVerificationNote" ADD CONSTRAINT "ShopVerificationNote_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "ShopVerificationApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopVerificationNote" ADD CONSTRAINT "ShopVerificationNote_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
