CREATE TYPE "TestDataBatchStatus" AS ENUM ('DRAFT', 'VERIFIED', 'REVOKED', 'CLEANED');
CREATE TYPE "TestDataEnvironment" AS ENUM ('DEVELOPMENT', 'TEST', 'STAGING', 'PRODUCTION');
CREATE TYPE "TestDataFinancialDisposition" AS ENUM ('NOT_FINANCIAL', 'SIMULATED', 'PROTECTED');
CREATE TYPE "TestDataCleanupStatus" AS ENUM ('PLANNED', 'RUNNING', 'COMPLETED', 'FAILED', 'STALE');
CREATE TYPE "TestDataCleanupScope" AS ENUM ('ACCOUNT', 'SHOP', 'BATCH', 'ALL');
CREATE TYPE "StorageCleanupStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'SKIPPED_SHARED');

CREATE TABLE "TestDataBatch" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "environment" "TestDataEnvironment" NOT NULL,
  "status" "TestDataBatchStatus" NOT NULL DEFAULT 'DRAFT',
  "createdBy" TEXT NOT NULL,
  "reviewedBy" TEXT,
  "reviewNote" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "cleanedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TestDataBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TestDataRegistry" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "environment" "TestDataEnvironment" NOT NULL,
  "financialDisposition" "TestDataFinancialDisposition" NOT NULL DEFAULT 'NOT_FINANCIAL',
  "externalProvider" TEXT,
  "externalId" TEXT,
  "externalAccountId" TEXT,
  "externalUserId" TEXT,
  "ownershipMetadata" JSONB,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TestDataRegistry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TestDataCleanupJob" (
  "id" TEXT NOT NULL,
  "batchId" TEXT,
  "scope" "TestDataCleanupScope" NOT NULL,
  "scopeId" TEXT,
  "environment" "TestDataEnvironment" NOT NULL,
  "status" "TestDataCleanupStatus" NOT NULL DEFAULT 'PLANNED',
  "plan" JSONB NOT NULL,
  "planHash" TEXT NOT NULL,
  "confirmation" TEXT,
  "requestedBy" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "error" TEXT,
  "result" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TestDataCleanupJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StorageCleanupTask" (
  "id" TEXT NOT NULL,
  "cleanupJobId" TEXT NOT NULL,
  "bucket" TEXT NOT NULL,
  "objectPath" TEXT NOT NULL,
  "status" "StorageCleanupStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "claimedAt" TIMESTAMP(3),
  "leaseExpiresAt" TIMESTAMP(3),
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastError" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StorageCleanupTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExternalIdentityCleanupTask" (
  "id" TEXT NOT NULL,
  "cleanupJobId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "expectedUserId" TEXT,
  "expectedAccountId" TEXT,
  "status" "StorageCleanupStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "claimedAt" TIMESTAMP(3),
  "leaseExpiresAt" TIMESTAMP(3),
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastError" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExternalIdentityCleanupTask_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TestDataRegistry_environment_entityType_entityId_key" ON "TestDataRegistry"("environment", "entityType", "entityId");
CREATE INDEX "TestDataBatch_status_environment_idx" ON "TestDataBatch"("status", "environment");
CREATE INDEX "TestDataBatch_createdAt_idx" ON "TestDataBatch"("createdAt");
CREATE INDEX "TestDataRegistry_batchId_entityType_idx" ON "TestDataRegistry"("batchId", "entityType");
CREATE INDEX "TestDataRegistry_entityType_entityId_idx" ON "TestDataRegistry"("entityType", "entityId");
CREATE INDEX "TestDataCleanupJob_status_expiresAt_idx" ON "TestDataCleanupJob"("status", "expiresAt");
CREATE INDEX "TestDataCleanupJob_scope_scopeId_status_idx" ON "TestDataCleanupJob"("scope", "scopeId", "status");
CREATE INDEX "TestDataCleanupJob_requestedBy_createdAt_idx" ON "TestDataCleanupJob"("requestedBy", "createdAt");
CREATE UNIQUE INDEX "StorageCleanupTask_cleanupJobId_bucket_objectPath_key" ON "StorageCleanupTask"("cleanupJobId", "bucket", "objectPath");
CREATE INDEX "StorageCleanupTask_status_nextAttemptAt_idx" ON "StorageCleanupTask"("status", "nextAttemptAt");
CREATE INDEX "StorageCleanupTask_status_leaseExpiresAt_idx" ON "StorageCleanupTask"("status", "leaseExpiresAt");
CREATE UNIQUE INDEX "ExternalIdentityCleanupTask_cleanupJobId_provider_externalId_key" ON "ExternalIdentityCleanupTask"("cleanupJobId", "provider", "externalId");
CREATE INDEX "ExternalIdentityCleanupTask_status_nextAttemptAt_idx" ON "ExternalIdentityCleanupTask"("status", "nextAttemptAt");
CREATE INDEX "ExternalIdentityCleanupTask_status_leaseExpiresAt_idx" ON "ExternalIdentityCleanupTask"("status", "leaseExpiresAt");

ALTER TABLE "TestDataRegistry" ADD CONSTRAINT "TestDataRegistry_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "TestDataBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TestDataCleanupJob" ADD CONSTRAINT "TestDataCleanupJob_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "TestDataBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StorageCleanupTask" ADD CONSTRAINT "StorageCleanupTask_cleanupJobId_fkey" FOREIGN KEY ("cleanupJobId") REFERENCES "TestDataCleanupJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExternalIdentityCleanupTask" ADD CONSTRAINT "ExternalIdentityCleanupTask_cleanupJobId_fkey" FOREIGN KEY ("cleanupJobId") REFERENCES "TestDataCleanupJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Prevent two active jobs from claiming the same explicit scope. PostgreSQL
-- advisory transaction locks additionally protect overlapping dependency graphs.
CREATE UNIQUE INDEX "TestDataCleanupJob_active_scope_key"
  ON "TestDataCleanupJob"("environment", "scope", COALESCE("scopeId", '__ALL__'))
  WHERE "status" IN ('PLANNED', 'RUNNING');
