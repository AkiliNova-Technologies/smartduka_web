import { beforeEach, describe, expect, it, vi } from "vitest";

type User = { id: string; email: string; name: string; avatarUrl: string | null; emailVerifiedAt: Date | null; lastLoginAt: Date | null; status: string; platformRole: string | null; vendorId?: string | null; vendorRole?: string | null };
type Account = { userId: string; provider: string; providerAccountId: string; user: User };
const users = new Map<string, User>();
const accounts = new Map<string, Account>();
const accountKey = (provider: string, uid: string) => `${provider}:${uid}`;
const mocks = vi.hoisted(() => ({ transaction: vi.fn() }));

vi.mock("@/lib/prisma/client", () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock("@prisma/client", () => ({ PlatformRole: { CUSTOMER: "CUSTOMER" }, UserStatus: { ACTIVE: "ACTIVE" } }));

import { AuthIdentityConflictError, synchronizeFirebaseIdentity } from "@/services/auth-sync";

function makeTx() {
  return {
    account: {
      findMany: vi.fn(async ({ where }: { where: { providerAccountId: string } }) => [...accounts.values()].filter((account) => account.providerAccountId === where.providerAccountId)),
      upsert: vi.fn(async ({ where, create }: { where: { provider_providerAccountId: { provider: string; providerAccountId: string } }; create: { userId: string; provider: string; providerAccountId: string } }) => {
        const key = accountKey(where.provider_providerAccountId.provider, where.provider_providerAccountId.providerAccountId);
        const existing = accounts.get(key);
        if (existing) return existing;
        const user = users.get(create.userId)!;
        const account = { ...create, user } as Account;
        accounts.set(key, account);
        return account;
      }),
    },
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => users.get(where.id) ?? null),
      findMany: vi.fn(async ({ where }: { where: { email: { equals: string } } }) => [...users.values()].filter((user) => user.email.toLowerCase() === where.email.equals.toLowerCase())),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<User> }) => { const user = { ...users.get(where.id)!, ...data }; users.set(user.id, user); return user; }),
      create: vi.fn(async ({ data }: { data: User }) => { if (users.has(data.id)) { const error = Object.assign(new Error("duplicate"), { code: "P2002" }); throw error; } const user = { ...data }; users.set(user.id, user); return user; }),
    },
  };
}

function seed(user: Partial<User> & Pick<User, "id" | "email">) { const value: User = { name: "Existing", avatarUrl: "avatar", emailVerifiedAt: null, lastLoginAt: null, status: "ACTIVE", platformRole: "CUSTOMER", vendorId: null, vendorRole: null, ...user }; users.set(value.id, value); return value; }
function identity(overrides: Partial<{ uid: string; email: string; name: string; picture: string; emailVerified: boolean }> = {}) { return { uid: "firebase-uid", email: "buyer@example.com", name: "Buyer", picture: "new-avatar", emailVerified: true, ...overrides }; }

beforeEach(() => { users.clear(); accounts.clear(); vi.clearAllMocks(); mocks.transaction.mockImplementation(async (fn: (tx: ReturnType<typeof makeTx>) => unknown) => fn(makeTx())); });

describe("Firebase identity synchronization", () => {
  it("creates one new Firebase user and mapping", async () => {
    const user = await synchronizeFirebaseIdentity(identity());
    expect(user.id).toBe("firebase-uid");
    expect(accounts.get(accountKey("firebase", "firebase-uid"))?.userId).toBe("firebase-uid");
  });

  it("is idempotent for repeated same-UID sync", async () => {
    await synchronizeFirebaseIdentity(identity());
    const user = await synchronizeFirebaseIdentity(identity({ name: "Updated Buyer" }));
    expect(users).toHaveLength(1); expect(user.name).toBe("Updated Buyer");
  });

  it("updates changed Firebase email by immutable UID without creating a second user", async () => {
    seed({ id: "firebase-uid", email: "old@example.com", vendorId: "vendor-1", vendorRole: "OWNER", platformRole: "VENDOR" });
    const user = await synchronizeFirebaseIdentity(identity({ email: "new@example.com" }));
    expect(users).toHaveLength(1); expect(user.email).toBe("new@example.com"); expect(user.vendorId).toBe("vendor-1"); expect(user.platformRole).toBe("VENDOR");
  });

  it("links a verified email to a legacy user without replacing its identity", async () => {
    seed({ id: "db-uuid", email: "buyer@example.com", platformRole: "ADMIN", vendorId: "vendor-2" });
    const user = await synchronizeFirebaseIdentity(identity());
    expect(user.id).toBe("db-uuid"); expect(user.platformRole).toBe("ADMIN"); expect(accounts.get(accountKey("firebase", "firebase-uid"))?.userId).toBe("db-uuid");
  });

  it("does not let an unverified email claim a legacy account", async () => {
    seed({ id: "db-uuid", email: "buyer@example.com" });
    await expect(synchronizeFirebaseIdentity(identity({ emailVerified: false }))).rejects.toBeInstanceOf(AuthIdentityConflictError);
  });

  it("fails closed when UID and email identify different users", async () => {
    const uidUser = seed({ id: "firebase-uid", email: "old@example.com" });
    seed({ id: "other", email: "buyer@example.com" });
    accounts.set(accountKey("firebase", "firebase-uid"), { userId: uidUser.id, provider: "firebase", providerAccountId: "firebase-uid", user: uidUser });
    await expect(synchronizeFirebaseIdentity(identity())).rejects.toBeInstanceOf(AuthIdentityConflictError);
  });

  it("preserves meaningful profile values when Firebase omits them", async () => {
    seed({ id: "firebase-uid", email: "buyer@example.com", name: "Saved Name", avatarUrl: "saved-avatar" });
    const user = await synchronizeFirebaseIdentity(identity({ name: "", picture: "" }));
    expect(user.name).toBe("Saved Name"); expect(user.avatarUrl).toBe("saved-avatar");
  });

  it("retries a unique-constraint race and resolves the resulting identity", async () => {
    let first = true;
    mocks.transaction.mockImplementation(async (fn: (tx: ReturnType<typeof makeTx>) => Promise<User>) => {
      if (first) { first = false; users.set("firebase-uid", seed({ id: "firebase-uid", email: "buyer@example.com" })); throw Object.assign(new Error("duplicate"), { code: "P2002" }); }
      return fn(makeTx());
    });
    const user = await synchronizeFirebaseIdentity(identity());
    expect(user.id).toBe("firebase-uid"); expect(users).toHaveLength(1);
  });
});
