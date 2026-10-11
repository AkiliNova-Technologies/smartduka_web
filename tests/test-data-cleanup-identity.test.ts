import { describe, expect, it, vi } from "vitest";
import { resolveFirebaseIdentityOwnership, TestDataCleanupError } from "@/services/test-data-cleanup";

const database = (links: Array<{ id: string; userId: string }>) => ({
  account: { findMany: vi.fn().mockResolvedValue(links) },
});
const firebase = (uid = "firebase-1") => ({ getUser: vi.fn().mockResolvedValue({ uid }) });

describe("test-data Firebase identity ownership", () => {
  it("accepts the immutable Firebase Account mapping for the selected synthetic user", async () => {
    const db = database([{ id: "account-1", userId: "user-1" }]);
    await expect(resolveFirebaseIdentityOwnership(db as never, "user-1", "firebase-1", firebase() as never)).resolves.toEqual({ accountId: "account-1", userId: "user-1", uid: "firebase-1" });
    expect(db.account.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { provider: "firebase", providerAccountId: "firebase-1" } }));
  });

  it.each([
    ["forged UID", [{ id: "account-2", userId: "user-2" }]],
    ["missing mapping", []],
    ["ambiguous mapping", [{ id: "account-1", userId: "user-1" }, { id: "account-2", userId: "user-1" }]],
  ])("fails closed for %s", async (_case, links) => {
    await expect(resolveFirebaseIdentityOwnership(database(links) as never, "user-1", "firebase-1", firebase() as never))
      .rejects.toMatchObject({ code: "IDENTITY_OWNERSHIP_UNPROVEN" } satisfies Partial<TestDataCleanupError>);
  });

  it("fails closed when Firebase is unavailable or returns another UID", async () => {
    const db = database([{ id: "account-1", userId: "user-1" }]);
    await expect(resolveFirebaseIdentityOwnership(db as never, "user-1", "firebase-1", firebase("other") as never)).rejects.toMatchObject({ code: "IDENTITY_OWNERSHIP_UNPROVEN" });
    await expect(resolveFirebaseIdentityOwnership(db as never, "user-1", "firebase-1", { getUser: vi.fn().mockRejectedValue(new Error("unavailable")) } as never)).rejects.toThrow("unavailable");
  });
});
