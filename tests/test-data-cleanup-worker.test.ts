import { readFileSync } from "node:fs";
import { StorageCleanupStatus } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: vi.fn() }));
vi.mock("@/lib/firebase/admin", () => ({ adminAuth: { getUser: vi.fn(), deleteUser: vi.fn() } }));
import { isCleanupTaskAvailable, verifyFirebaseDeletionOwnership } from "@/services/test-data-storage-cleanup";

const now = new Date("2026-10-11T12:00:00.000Z");
const workerSource = readFileSync(`${process.cwd()}/src/services/test-data-storage-cleanup.ts`, "utf8");
const task = (overrides = {}) => ({ status: StorageCleanupStatus.PROCESSING, attempts: 1, nextAttemptAt: now, leaseExpiresAt: new Date(now.getTime() - 1), ...overrides });
const identity = (overrides = {}) => ({ provider: "FIREBASE", externalId: "uid-1", expectedUserId: "user-1", expectedAccountId: "account-1", ...overrides });

describe("test-data cleanup worker leases", () => {
  it("reclaims an expired processing lease but not an active claim", () => {
    expect(isCleanupTaskAvailable(task(), now)).toBe(true);
    expect(isCleanupTaskAvailable(task({ leaseExpiresAt: new Date(now.getTime() + 1) }), now)).toBe(false);
  });

  it("keeps retry attempts bounded", () => {
    expect(isCleanupTaskAvailable(task({ attempts: 10 }), now)).toBe(false);
  });

  it("uses an atomic compare-and-set claim so concurrent workers cannot both win", () => {
    expect(workerSource).toContain("updateMany({ where: { AND: [availableTaskWhere(now), { id: task.id, attempts: task.attempts }]");
    expect(workerSource).toContain("if (!claim.count) continue");
  });
});

describe("Firebase deletion revalidation", () => {
  it("permits a legitimate post-commit synthetic identity without deleting it in the test", async () => {
    const db = { account: { findUnique: vi.fn().mockResolvedValue(null) } };
    const firebase = { getUser: vi.fn().mockResolvedValue({ uid: "uid-1" }) };
    await expect(verifyFirebaseDeletionOwnership(identity(), db as never, firebase as never)).resolves.toBeUndefined();
  });

  it("rejects legacy tasks, rebound mappings, and provider mismatches", async () => {
    const firebase = { getUser: vi.fn().mockResolvedValue({ uid: "uid-1" }) };
    await expect(verifyFirebaseDeletionOwnership(identity({ expectedAccountId: null }), { account: { findUnique: vi.fn() } } as never, firebase as never)).rejects.toThrow("no authoritative ownership evidence");
    await expect(verifyFirebaseDeletionOwnership(identity(), { account: { findUnique: vi.fn().mockResolvedValue({ id: "new-account" }) } } as never, firebase as never)).rejects.toThrow("currently linked");
    await expect(verifyFirebaseDeletionOwnership(identity({ externalId: "uid-2" }), { account: { findUnique: vi.fn().mockResolvedValue(null) } } as never, firebase as never)).rejects.toThrow("mismatched identity");
  });

  it("fails closed when Firebase is unavailable during deletion revalidation", async () => {
    const firebase = { getUser: vi.fn().mockRejectedValue(new Error("provider unavailable")) };
    await expect(verifyFirebaseDeletionOwnership(identity(), { account: { findUnique: vi.fn().mockResolvedValue(null) } } as never, firebase as never)).rejects.toThrow("provider unavailable");
  });
});
