import { prisma } from "@/lib/prisma/client";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { STORAGE_BUCKETS } from "@/lib/supabase/storage-contract";
import { adminAuth } from "@/lib/firebase/admin";
import { StorageCleanupStatus } from "@prisma/client";

const MAX_ATTEMPTS = 10;
const CLAIM_LEASE_MS = 5 * 60 * 1000;

type CleanupRuntimeEnvironment = Partial<Record<"NODE_ENV" | "TEST_DATA_ENVIRONMENT" | "ENABLE_TEST_DATA_EXTERNAL_CLEANUP", string>>;

/** External deletion is an opt-in development tool and can never run in production. */
export function isExternalCleanupExecutionEnabled(environment: CleanupRuntimeEnvironment = process.env) {
  const cleanupEnvironment = environment.TEST_DATA_ENVIRONMENT?.toUpperCase();
  return environment.NODE_ENV !== "production"
    && cleanupEnvironment !== "PRODUCTION"
    && environment.ENABLE_TEST_DATA_EXTERNAL_CLEANUP === "true";
}

export function isCleanupTaskAvailable(task: { status: StorageCleanupStatus; attempts: number; nextAttemptAt: Date; leaseExpiresAt: Date | null }, now: Date) {
  if (task.attempts >= MAX_ATTEMPTS) return false;
  if (task.status === StorageCleanupStatus.PROCESSING) return Boolean(task.leaseExpiresAt && task.leaseExpiresAt < now);
  return (task.status === StorageCleanupStatus.PENDING || task.status === StorageCleanupStatus.FAILED) && task.nextAttemptAt <= now;
}

export async function verifyFirebaseDeletionOwnership(
  task: { provider: string; externalId: string; expectedUserId: string | null; expectedAccountId: string | null },
  database: Pick<typeof prisma, "account"> = prisma,
  firebase: Pick<typeof adminAuth, "getUser"> = adminAuth,
) {
  if (task.provider !== "FIREBASE" || !task.externalId || task.externalId.length > 128) throw new Error("External identity target is outside the provider allow-list.");
  if (!task.expectedUserId || !task.expectedAccountId) throw new Error("External identity task has no authoritative ownership evidence.");
  const rebound = await database.account.findUnique({ where: { provider_providerAccountId: { provider: "firebase", providerAccountId: task.externalId } }, select: { id: true, userId: true, user: { select: { status: true, deletedAt: true } } } });
  if (rebound) throw new Error("External identity is currently linked to a database account and will not be deleted.");
  const firebaseUser = await firebase.getUser(task.externalId);
  if (firebaseUser.uid !== task.externalId) throw new Error("Firebase returned a mismatched identity.");
}

const availableTaskWhere = (now: Date) => ({
  attempts: { lt: MAX_ATTEMPTS },
  OR: [
    { status: { in: [StorageCleanupStatus.PENDING, StorageCleanupStatus.FAILED] }, nextAttemptAt: { lte: now } },
    { status: StorageCleanupStatus.PROCESSING, leaseExpiresAt: { lt: now } },
  ],
});

async function recordWorkerEvent(action: string, entity: string, entityId: string, recovered: boolean) {
  await prisma.auditLog.create({ data: { action, entity, entityId, newValues: { recovered } } }).catch(() => undefined);
}

function isApprovedObject(bucket: string, objectPath: string) {
  return Object.values(STORAGE_BUCKETS).includes(bucket as (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS])
    && /^(products|reviews|categories|shops|marketing|kyc)\//.test(objectPath)
    && !objectPath.includes("..") && !objectPath.startsWith("/");
}

async function referenceCount(bucket: string, objectPath: string) {
  const canonical = `storage://${bucket}/${objectPath}`;
  const publicBase = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const publicUrl = publicBase ? `${publicBase}/storage/v1/object/public/${bucket}/${objectPath}` : "__no_public_url__";
  const candidates = [canonical, publicUrl];
  const [images, reviews, vendorDocuments, documents, logos, banners, promotionDesktop, promotionMobile, categories] = await Promise.all([
    prisma.productImage.count({ where: { url: { in: candidates } } }),
    prisma.productReview.count({ where: { OR: candidates.map((value) => ({ imageUrls: { has: value } })) } }),
    prisma.vendorDocument.count({ where: { url: { in: candidates } } }),
    prisma.document.count({ where: { url: { in: candidates } } }),
    prisma.vendorProfile.count({ where: { logoUrl: { in: candidates } } }),
    prisma.vendorProfile.count({ where: { bannerUrl: { in: candidates } } }),
    prisma.promotion.count({ where: { desktopImageUrl: { in: candidates } } }),
    prisma.promotion.count({ where: { mobileImageUrl: { in: candidates } } }),
    prisma.productCategory.count({ where: { image: { in: candidates } } }),
  ]);
  return images + reviews + vendorDocuments + documents + logos + banners + promotionDesktop + promotionMobile + categories;
}

/** Durable, independently retryable post-commit object deletion. */
export class TestDataStorageCleanupService {
  static async processPending(limit = 25) {
    if (!isExternalCleanupExecutionEnabled()) {
      return {
        disabled: true,
        reason: "Automated Firebase and storage deletion is disabled by the server release boundary.",
        storage: { completed: 0, failed: 0, skippedShared: 0 },
        identities: { completed: 0, failed: 0 },
      };
    }
    const now = new Date();
    const tasks = await prisma.storageCleanupTask.findMany({
      where: availableTaskWhere(now),
      orderBy: { createdAt: "asc" }, take: Math.max(1, Math.min(limit, 100)),
    });
    const result = { completed: 0, failed: 0, skippedShared: 0 };
    for (const task of tasks) {
      const recovered = task.status === "PROCESSING";
      const claim = await prisma.storageCleanupTask.updateMany({ where: { AND: [availableTaskWhere(now), { id: task.id, attempts: task.attempts }] }, data: { status: "PROCESSING", attempts: { increment: 1 }, claimedAt: now, leaseExpiresAt: new Date(now.getTime() + CLAIM_LEASE_MS) } });
      if (!claim.count) continue;
      await recordWorkerEvent(recovered ? "TEST_DATA_STORAGE_TASK_RECLAIMED" : "TEST_DATA_STORAGE_TASK_CLAIMED", "StorageCleanupTask", task.id, recovered);
      try {
        if (!isApprovedObject(task.bucket, task.objectPath)) throw new Error("Storage target is outside the cleanup allow-list.");
        if (await referenceCount(task.bucket, task.objectPath)) {
          await prisma.storageCleanupTask.update({ where: { id: task.id }, data: { status: "SKIPPED_SHARED", leaseExpiresAt: null, lastError: "Object gained a database reference after the cleanup plan was committed." } });
          result.skippedShared += 1;
          continue;
        }
        const { error } = await getSupabaseServerClient().storage.from(task.bucket).remove([task.objectPath]);
        if (error) throw error;
        await prisma.storageCleanupTask.update({ where: { id: task.id }, data: { status: "COMPLETED", completedAt: new Date(), leaseExpiresAt: null, lastError: null } });
        result.completed += 1;
      } catch (error) {
        const attempts = task.attempts + 1;
        const delayMinutes = Math.min(24 * 60, 2 ** Math.min(attempts, 10));
        await prisma.storageCleanupTask.update({ where: { id: task.id }, data: { status: "FAILED", leaseExpiresAt: null, lastError: error instanceof Error ? error.message.slice(0, 2000) : "Storage deletion failed.", nextAttemptAt: new Date(Date.now() + delayMinutes * 60_000) } });
        result.failed += 1;
      }
    }
    const identityTasks = await prisma.externalIdentityCleanupTask.findMany({
      where: availableTaskWhere(now),
      orderBy: { createdAt: "asc" }, take: Math.max(1, Math.min(limit, 100)),
    });
    const identities = { completed: 0, failed: 0 };
    for (const task of identityTasks) {
      const recovered = task.status === "PROCESSING";
      const claim = await prisma.externalIdentityCleanupTask.updateMany({ where: { AND: [availableTaskWhere(now), { id: task.id, attempts: task.attempts }] }, data: { status: "PROCESSING", attempts: { increment: 1 }, claimedAt: now, leaseExpiresAt: new Date(now.getTime() + CLAIM_LEASE_MS) } });
      if (!claim.count) continue;
      await recordWorkerEvent(recovered ? "TEST_DATA_IDENTITY_TASK_RECLAIMED" : "TEST_DATA_IDENTITY_TASK_CLAIMED", "ExternalIdentityCleanupTask", task.id, recovered);
      try {
        await verifyFirebaseDeletionOwnership(task);
        await adminAuth.deleteUser(task.externalId).catch((error: unknown) => {
          if (typeof error === "object" && error && "code" in error && error.code === "auth/user-not-found") return;
          throw error;
        });
        await prisma.externalIdentityCleanupTask.update({ where: { id: task.id }, data: { status: "COMPLETED", completedAt: new Date(), leaseExpiresAt: null, lastError: null } });
        identities.completed += 1;
      } catch (error) {
        const attempts = task.attempts + 1;
        const delayMinutes = Math.min(24 * 60, 2 ** Math.min(attempts, 10));
        await prisma.externalIdentityCleanupTask.update({ where: { id: task.id }, data: { status: "FAILED", leaseExpiresAt: null, lastError: error instanceof Error ? error.message.slice(0, 2000) : "Identity deletion failed.", nextAttemptAt: new Date(Date.now() + delayMinutes * 60_000) } });
        identities.failed += 1;
      }
    }
    return { storage: result, identities };
  }
}
