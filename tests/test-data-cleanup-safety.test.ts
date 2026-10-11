import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { assertTestDataCleanupExecutionAllowed, hashCleanupPlan, LARGE_CLEANUP_CONFIRMATION, runSerializableWithRetries, TEST_DATA_DEPENDENCY_INVENTORY, type TestDataCleanupPlan } from "@/services/test-data-cleanup";

const root = process.cwd();
const source = readFileSync(`${root}/src/services/test-data-cleanup.ts`, "utf8");
const schema = readFileSync(`${root}/prisma/schema.prisma`, "utf8");
const migration = readFileSync(`${root}/prisma/migrations/20261011120000_test_data_cleanup_registry/migration.sql`, "utf8");

function plan(overrides: Partial<TestDataCleanupPlan> = {}): TestDataCleanupPlan {
  return {
    version: 1, environment: "TEST", scope: "BATCH", scopeId: "batch-1", generatedAt: "2026-10-11T00:00:00.000Z",
    entities: { User: ["user-1"] }, counts: { User: 1 }, totalDependentRecords: 1, protectedRecords: 0,
    deletionOrder: ["User"], blockers: [], storage: [], externalIdentities: [], registryIds: ["registry-1"], batchIds: ["batch-1"], ...overrides,
  };
}

describe("test-data cleanup safety contract", () => {
  it("uses explicit reviewed ownership instead of test-looking names or email domains", () => {
    expect(schema).toContain("model TestDataRegistry");
    expect(schema).toMatch(/status\s+TestDataBatchStatus\s+@default\(DRAFT\)/);
    expect(source).toContain('batch: { status: "VERIFIED", environment }');
    expect(source).not.toMatch(/email.*(?:test|example)|name.*includes\(["']test/i);
  });

  it("keeps production execution unconditionally denied and financial evidence explicitly classified", () => {
    expect(() => assertTestDataCleanupExecutionAllowed("PRODUCTION")).toThrowError(expect.objectContaining({ code: "PRODUCTION_DISABLED" }));
    expect(() => assertTestDataCleanupExecutionAllowed("STAGING", "production")).toThrowError(expect.objectContaining({ code: "PRODUCTION_DISABLED" }));
    expect(source).not.toContain("ALLOW_PRODUCTION_TEST_DATA_CLEANUP");
    expect(source).toContain('financialDisposition !== "SIMULATED"');
    expect(source).toContain("RETAINED_EVIDENCE_TYPES");
    expect(source).toContain("does not");
    expect(LARGE_CLEANUP_CONFIRMATION).toBe("DELETE TEST DATA");
  });

  it("has durable overlap, stale-plan, and storage retry state", () => {
    expect(migration).toContain('CREATE UNIQUE INDEX "TestDataCleanupJob_active_scope_key"');
    expect(migration).toContain("WHERE \"status\" IN ('PLANNED', 'RUNNING')");
    expect(schema).toContain("model StorageCleanupTask");
    expect(source).toContain("pg_advisory_xact_lock");
    expect(source).toContain("TransactionIsolationLevel.Serializable");
  });

  it("fingerprints meaningful plan changes but ignores preview timestamps", () => {
    expect(hashCleanupPlan(plan())).toBe(hashCleanupPlan(plan({ generatedAt: "2026-10-11T00:09:00.000Z" })));
    expect(hashCleanupPlan(plan())).not.toBe(hashCleanupPlan(plan({ entities: { User: ["user-2"] } })));
  });

  it("inventories every requested platform domain from the actual schema", () => {
    expect(TEST_DATA_DEPENDENCY_INVENTORY.identity).toContain("Session");
    expect(TEST_DATA_DEPENDENCY_INVENTORY.vendors).toContain("ShopVerificationDocument");
    expect(TEST_DATA_DEPENDENCY_INVENTORY.catalogue).toContain("ProductVariant");
    expect(TEST_DATA_DEPENDENCY_INVENTORY.orders).toContain("OrderItem");
    expect(TEST_DATA_DEPENDENCY_INVENTORY.financial).toContain("PaymentAttempt");
    expect(TEST_DATA_DEPENDENCY_INVENTORY.marketing).toContain("PromotionReservation");
  });

  it("retries only serialization conflicts and reruns the complete operation", async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error("conflict"), { code: "P2034" }))
      .mockResolvedValue("done");
    const wait = vi.fn().mockResolvedValue(undefined);
    await expect(runSerializableWithRetries(operation, wait)).resolves.toBe("done");
    expect(operation).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledOnce();
  });

  it("fails clearly after bounded conflicts and never retries unrelated errors", async () => {
    const conflict = vi.fn().mockRejectedValue(Object.assign(new Error("conflict"), { code: "P2034" }));
    await expect(runSerializableWithRetries(conflict, async () => undefined)).rejects.toMatchObject({ code: "SERIALIZATION_RETRIES_EXHAUSTED" });
    expect(conflict).toHaveBeenCalledTimes(3);
    const unrelated = vi.fn().mockRejectedValue(Object.assign(new Error("down"), { code: "P1001" }));
    await expect(runSerializableWithRetries(unrelated, async () => undefined)).rejects.toThrow("down");
    expect(unrelated).toHaveBeenCalledOnce();
  });
});
