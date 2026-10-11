import { createHash } from "node:crypto";
import { Prisma, PlatformRole, type TestDataCleanupScope, type TestDataEnvironment } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { requireAdminContext } from "@/lib/auth/admin-context";
import { STORAGE_BUCKETS } from "@/lib/supabase/storage-contract";
import { adminAuth } from "@/lib/firebase/admin";

const PLAN_TTL_MS = 10 * 60 * 1000;
const SERIALIZABLE_ATTEMPTS = 3;
export const LARGE_CLEANUP_CONFIRMATION = "DELETE TEST DATA";

/** Every application table with a conventional string `id` that may be registered. */
export const TEST_DATA_ENTITY_TYPES = [
  "Account", "Session", "User", "UserDevice", "UserSettings", "VendorApplication", "VendorDocument",
  "VendorProfile", "ShopVerificationApplication", "ShopVerificationDocument", "ShopVerificationActivity",
  "ShopVerificationNote", "ProductCategory", "Product", "ProductImage", "ProductVariant", "ProductReview",
  "ShopReview", "ReviewReply", "ReviewReport", "MarketplaceReport", "MarketplaceReportActivity",
  "MarketplaceReportNote", "WishlistItem", "RecentlyViewed", "Order", "SubOrder", "OrderItem",
  "PaymentIntent", "PaymentProviderEvent", "PaymentAttempt", "FinancialLedger", "ReturnRequest", "ReturnItem",
  "Refund", "RefundItem", "Dispute", "RiskFlag", "VendorPayout", "VendorPayoutAccount",
  "VendorPayoutAllocation", "VendorPaymentAccount", "VendorSubscription", "Notification", "Document", "AuditLog",
  "Promotion", "FeaturedProduct", "FeaturedShop", "PromotionCreditLedger", "PromotionCampaign",
  "PromotionReservation", "PromotionQuote", "PlatformRevenueOrder", "PlatformPaymentIntent",
  "PaymentGatewayWebhookLog", "ReconciliationFinding",
] as const;

export type TestDataEntityType = (typeof TEST_DATA_ENTITY_TYPES)[number];

const ENTITY_TYPE_SET = new Set<string>(TEST_DATA_ENTITY_TYPES);
const FINANCIAL_TYPES = new Set<TestDataEntityType>([
  "PaymentIntent", "PaymentProviderEvent", "PaymentAttempt", "FinancialLedger", "Refund", "RefundItem",
  "VendorPayout", "VendorPayoutAllocation", "PlatformRevenueOrder", "PlatformPaymentIntent",
  "PaymentGatewayWebhookLog", "ReconciliationFinding",
]);
const RETAINED_EVIDENCE_TYPES = new Set<TestDataEntityType>(["PaymentGatewayWebhookLog", "ReconciliationFinding"]);

export const TEST_DATA_DEPENDENCY_INVENTORY = {
  identity: ["Account", "Session", "UserDevice", "UserSettings", "WishlistItem", "RecentlyViewed", "Notification"],
  vendors: ["VendorApplication", "VendorDocument", "VendorProfile", "ShopVerificationApplication", "ShopVerificationDocument", "ShopVerificationActivity", "ShopVerificationNote", "VendorPaymentAccount", "VendorPayoutAccount", "VendorSubscription"],
  catalogue: ["Product", "ProductImage", "ProductVariant", "FeaturedProduct", "ProductReview", "ShopReview", "ReviewReply", "ReviewReport"],
  orders: ["Order", "SubOrder", "OrderItem", "ReturnRequest", "ReturnItem", "Refund", "RefundItem", "Dispute", "RiskFlag"],
  financial: ["PaymentIntent", "PaymentProviderEvent", "PaymentAttempt", "FinancialLedger", "VendorPayout", "VendorPayoutAllocation", "PlatformRevenueOrder", "PlatformPaymentIntent", "ReconciliationFinding", "PaymentGatewayWebhookLog"],
  marketing: ["Promotion", "FeaturedShop", "PromotionCreditLedger", "PromotionCampaign", "PromotionReservation", "PromotionQuote"],
  moderation: ["MarketplaceReport", "MarketplaceReportActivity", "MarketplaceReportNote", "AuditLog"],
  externalFiles: ["ProductImage", "ProductReview", "VendorDocument", "Document", "VendorProfile", "Promotion", "ProductCategory"],
} as const;

type ForeignKey = {
  childTable: string;
  childColumn: string;
  parentTable: string;
  parentColumn: string;
  deleteRule: "CASCADE" | "RESTRICT" | "NO ACTION" | "SET NULL" | "SET DEFAULT";
};

type RegisteredRecord = {
  id: string;
  batchId: string;
  entityType: string;
  entityId: string;
  financialDisposition: "NOT_FINANCIAL" | "SIMULATED" | "PROTECTED";
  externalProvider: string | null;
  externalId: string | null;
  externalAccountId: string | null;
  externalUserId: string | null;
};

export type CleanupBlocker = { entityType: string; entityId: string; reason: string };
export type StoragePlanItem = { bucket: string; objectPath: string; shared: boolean; reason?: string };
export type TestDataCleanupPlan = {
  version: 1;
  environment: TestDataEnvironment;
  scope: TestDataCleanupScope;
  scopeId: string | null;
  generatedAt: string;
  entities: Record<string, string[]>;
  counts: Record<string, number>;
  totalDependentRecords: number;
  protectedRecords: number;
  deletionOrder: string[];
  blockers: CleanupBlocker[];
  storage: StoragePlanItem[];
  externalIdentities: Array<{ provider: "FIREBASE"; externalId: string; expectedUserId: string; expectedAccountId: string }>;
  registryIds: string[];
  batchIds: string[];
};

export class TestDataCleanupError extends Error {
  constructor(message: string, public readonly code: string, public readonly status = 400) {
    super(message);
    this.name = "TestDataCleanupError";
  }
}

function currentEnvironment(): TestDataEnvironment {
  const configured = process.env.TEST_DATA_ENVIRONMENT?.toUpperCase();
  if (configured && ["DEVELOPMENT", "TEST", "STAGING", "PRODUCTION"].includes(configured)) return configured as TestDataEnvironment;
  if (process.env.NODE_ENV === "production") return "PRODUCTION" as TestDataEnvironment;
  if (process.env.NODE_ENV === "test") return "TEST" as TestDataEnvironment;
  return "DEVELOPMENT" as TestDataEnvironment;
}

export function assertTestDataCleanupExecutionAllowed(environment: TestDataEnvironment, runtimeNodeEnvironment = process.env.NODE_ENV) {
  if (environment === "PRODUCTION" || runtimeNodeEnvironment === "production") {
    throw new TestDataCleanupError("Test-data cleanup is disabled in production.", "PRODUCTION_DISABLED", 403);
  }
}

function quoteIdentifier(value: string) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) throw new TestDataCleanupError("Unsafe database identifier discovered.", "UNSAFE_SCHEMA", 500);
  return `"${value.replaceAll('"', '""')}"`;
}

function uniqueSorted(values: Iterable<string>) {
  return [...new Set(values)].sort();
}

function stablePlanValue(plan: TestDataCleanupPlan) {
  return {
    ...plan,
    generatedAt: undefined,
    entities: Object.fromEntries(Object.entries(plan.entities).sort(([a], [b]) => a.localeCompare(b)).map(([key, ids]) => [key, [...ids].sort()])),
    counts: Object.fromEntries(Object.entries(plan.counts).sort(([a], [b]) => a.localeCompare(b))),
    blockers: [...plan.blockers].sort((a, b) => `${a.entityType}:${a.entityId}:${a.reason}`.localeCompare(`${b.entityType}:${b.entityId}:${b.reason}`)),
    storage: [...plan.storage].sort((a, b) => `${a.bucket}:${a.objectPath}`.localeCompare(`${b.bucket}:${b.objectPath}`)),
    externalIdentities: [...plan.externalIdentities].sort((a, b) => `${a.provider}:${a.externalId}`.localeCompare(`${b.provider}:${b.externalId}`)),
    registryIds: [...plan.registryIds].sort(),
    batchIds: [...plan.batchIds].sort(),
  };
}

export function hashCleanupPlan(plan: TestDataCleanupPlan) {
  return createHash("sha256").update(JSON.stringify(stablePlanValue(plan))).digest("hex");
}

export async function resolveFirebaseIdentityOwnership(
  database: Pick<typeof prisma, "account">,
  userId: string,
  uid: string,
  firebase: Pick<typeof adminAuth, "getUser"> = adminAuth,
) {
  const links = await database.account.findMany({
    where: { provider: "firebase", providerAccountId: uid },
    select: { id: true, userId: true },
  });
  if (links.length !== 1 || links[0].userId !== userId) {
    throw new TestDataCleanupError("The Firebase identity is not authoritatively linked to the selected user.", "IDENTITY_OWNERSHIP_UNPROVEN", 409);
  }
  const firebaseUser = await firebase.getUser(uid);
  if (firebaseUser.uid !== uid) throw new TestDataCleanupError("Firebase returned a mismatched identity.", "IDENTITY_OWNERSHIP_UNPROVEN", 409);
  return { accountId: links[0].id, userId: links[0].userId, uid };
}

async function foreignKeys(db: typeof prisma): Promise<ForeignKey[]> {
  return db.$queryRaw<ForeignKey[]>`
    SELECT kcu.table_name AS "childTable", kcu.column_name AS "childColumn",
           ccu.table_name AS "parentTable", ccu.column_name AS "parentColumn",
           rc.delete_rule AS "deleteRule"
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.constraint_schema = kcu.constraint_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name AND tc.constraint_schema = rc.constraint_schema
    JOIN information_schema.constraint_column_usage ccu
      ON rc.unique_constraint_name = ccu.constraint_name AND rc.unique_constraint_schema = ccu.constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.constraint_schema = 'public'
  `;
}

async function childIds(db: typeof prisma, fk: ForeignKey, parentIds: string[]) {
  if (!parentIds.length || fk.parentColumn !== "id" || !ENTITY_TYPE_SET.has(fk.childTable)) return [];
  const placeholders = parentIds.map((_, index) => `$${index + 1}`).join(",");
  const sql = `SELECT "id" FROM ${quoteIdentifier(fk.childTable)} WHERE ${quoteIdentifier(fk.childColumn)} IN (${placeholders})`;
  const rows = await db.$queryRawUnsafe<Array<{ id: string }>>(sql, ...parentIds);
  return rows.map((row) => row.id);
}

function addEntity(entities: Map<string, Set<string>>, entityType: string, entityId: string) {
  const ids = entities.get(entityType) ?? new Set<string>();
  const before = ids.size;
  ids.add(entityId);
  entities.set(entityType, ids);
  return ids.size !== before;
}

async function loadScopeRegistry(db: typeof prisma, scope: TestDataCleanupScope, scopeId: string | null, environment: TestDataEnvironment) {
  const batchFilter = { status: "VERIFIED" as const, environment };
  if (scope === "ALL") return db.testDataRegistry.findMany({ where: { environment, batch: batchFilter } });
  if (!scopeId) throw new TestDataCleanupError("A scope identifier is required.", "INVALID_SCOPE");
  if (scope === "BATCH") return db.testDataRegistry.findMany({ where: { environment, batchId: scopeId, batch: batchFilter } });
  const entityType = scope === "ACCOUNT" ? "User" : "VendorProfile";
  const root = await db.testDataRegistry.findFirst({ where: { environment, entityType, entityId: scopeId, batch: batchFilter } });
  if (!root) throw new TestDataCleanupError("The selected record is not part of a verified test-data batch.", "OWNERSHIP_UNPROVEN", 409);
  return [root];
}

function deletionOrderFor(entities: Map<string, Set<string>>, fks: ForeignKey[]) {
  const tables = new Set(entities.keys());
  const edges = fks.filter((fk) => tables.has(fk.childTable) && tables.has(fk.parentTable) && fk.childTable !== fk.parentTable);
  const result: string[] = [];
  const remaining = new Set(tables);
  while (remaining.size) {
    const leaf = [...remaining].filter((table) => !edges.some((edge) => edge.parentTable === table && remaining.has(edge.childTable))).sort()[0];
    if (!leaf) {
      result.push(...[...remaining].sort());
      break;
    }
    result.push(leaf);
    remaining.delete(leaf);
  }
  return result;
}

function parseStorageReference(value: string): { bucket: string; objectPath: string } | null {
  let bucket: string | undefined;
  let objectPath: string | undefined;
  const canonical = /^storage:\/\/([^/]+)\/(.+)$/.exec(value);
  if (canonical) [, bucket, objectPath] = canonical;
  if (!canonical) {
    try {
      const url = new URL(value);
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;
      if (!base || url.origin !== base.origin) return null;
      const publicObject = /^\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/.exec(url.pathname);
      if (publicObject) [, bucket, objectPath] = publicObject;
    } catch { return null; }
  }
  if (!bucket || !objectPath || !Object.values(STORAGE_BUCKETS).includes(bucket as (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS])) return null;
  if (objectPath.includes("..") || objectPath.startsWith("/") || !/^(products|reviews|categories|shops|marketing|kyc)\//.test(objectPath)) return null;
  return { bucket, objectPath };
}

async function storageCandidates(db: typeof prisma, entities: Map<string, Set<string>>): Promise<StoragePlanItem[]> {
  const refs: Array<{ value: string; source: string }> = [];
  const add = (value: string | null | undefined, source: string) => { if (value) refs.push({ value, source }); };
  const ids = (type: string) => [...(entities.get(type) ?? [])];
  const [images, reviews, vendorDocs, docs, vendors, promotions, categories] = await Promise.all([
    ids("ProductImage").length ? db.productImage.findMany({ where: { id: { in: ids("ProductImage") } }, select: { id: true, url: true } }) : [],
    ids("ProductReview").length ? db.productReview.findMany({ where: { id: { in: ids("ProductReview") } }, select: { id: true, imageUrls: true } }) : [],
    ids("VendorDocument").length ? db.vendorDocument.findMany({ where: { id: { in: ids("VendorDocument") } }, select: { id: true, url: true } }) : [],
    ids("Document").length ? db.document.findMany({ where: { id: { in: ids("Document") } }, select: { id: true, url: true } }) : [],
    ids("VendorProfile").length ? db.vendorProfile.findMany({ where: { id: { in: ids("VendorProfile") } }, select: { id: true, logoUrl: true, bannerUrl: true } }) : [],
    ids("Promotion").length ? db.promotion.findMany({ where: { id: { in: ids("Promotion") } }, select: { id: true, desktopImageUrl: true, mobileImageUrl: true } }) : [],
    ids("ProductCategory").length ? db.productCategory.findMany({ where: { id: { in: ids("ProductCategory") } }, select: { id: true, image: true } }) : [],
  ]);
  images.forEach((row) => add(row.url, `ProductImage:${row.id}`));
  reviews.forEach((row) => row.imageUrls.forEach((url) => add(url, `ProductReview:${row.id}`)));
  vendorDocs.forEach((row) => add(row.url, `VendorDocument:${row.id}`));
  docs.forEach((row) => add(row.url, `Document:${row.id}`));
  vendors.forEach((row) => { add(row.logoUrl, `VendorProfile:${row.id}:logo`); add(row.bannerUrl, `VendorProfile:${row.id}:banner`); });
  promotions.forEach((row) => { add(row.desktopImageUrl, `Promotion:${row.id}:desktop`); add(row.mobileImageUrl, `Promotion:${row.id}:mobile`); });
  categories.forEach((row) => add(row.image, `ProductCategory:${row.id}`));
  const parsed = refs.flatMap((ref) => { const target = parseStorageReference(ref.value); return target ? [{ ...target, value: ref.value, source: ref.source }] : []; });
  const unique = new Map(parsed.map((item) => [`${item.bucket}/${item.objectPath}`, item]));
  const results: StoragePlanItem[] = [];
  for (const item of unique.values()) {
    const [imageCount, reviewCount, vendorDocCount, docCount, vendorLogoCount, vendorBannerCount, promotionDesktopCount, promotionMobileCount, categoryCount] = await Promise.all([
      db.productImage.count({ where: { url: item.value } }), db.productReview.count({ where: { imageUrls: { has: item.value } } }),
      db.vendorDocument.count({ where: { url: item.value } }), db.document.count({ where: { url: item.value } }),
      db.vendorProfile.count({ where: { logoUrl: item.value } }), db.vendorProfile.count({ where: { bannerUrl: item.value } }),
      db.promotion.count({ where: { desktopImageUrl: item.value } }), db.promotion.count({ where: { mobileImageUrl: item.value } }),
      db.productCategory.count({ where: { image: item.value } }),
    ]);
    const totalReferences = imageCount + reviewCount + vendorDocCount + docCount + vendorLogoCount + vendorBannerCount + promotionDesktopCount + promotionMobileCount + categoryCount;
    const selectedReferences = new Set(parsed.filter((candidate) => candidate.value === item.value).map((candidate) => candidate.source)).size;
    results.push({ bucket: item.bucket, objectPath: item.objectPath, shared: totalReferences > selectedReferences, ...(totalReferences > selectedReferences ? { reason: "Still referenced outside this cleanup plan." } : {}) });
  }
  return results.sort((a, b) => `${a.bucket}/${a.objectPath}`.localeCompare(`${b.bucket}/${b.objectPath}`));
}

async function buildPlan(db: typeof prisma, scope: TestDataCleanupScope, scopeId: string | null, environment: TestDataEnvironment): Promise<TestDataCleanupPlan> {
  const initial = await loadScopeRegistry(db, scope, scopeId, environment);
  if (!initial.length) throw new TestDataCleanupError("No verified test records match this scope.", "EMPTY_SCOPE", 404);
  const allRegistry = await db.testDataRegistry.findMany({ where: { environment, batch: { status: "VERIFIED", environment } } });
  const registered = new Map(allRegistry.map((row) => [`${row.entityType}:${row.entityId}`, row as RegisteredRecord]));
  const entities = new Map<string, Set<string>>();
  const includedRegistry = new Map<string, RegisteredRecord>();
  for (const row of initial) {
    if (!ENTITY_TYPE_SET.has(row.entityType)) continue;
    addEntity(entities, row.entityType, row.entityId);
    includedRegistry.set(`${row.entityType}:${row.entityId}`, row as RegisteredRecord);
  }
  const blockers: CleanupBlocker[] = [];
  const protectedKeys = new Set<string>();
  const fks = await foreignKeys(db);
  let changed = true;
  while (changed) {
    changed = false;
    for (const fk of fks) {
      const parentIds = [...(entities.get(fk.parentTable) ?? [])];
      if (!parentIds.length) continue;
      for (const childId of await childIds(db, fk, parentIds)) {
        const key = `${fk.childTable}:${childId}`;
        if (entities.get(fk.childTable)?.has(childId) || protectedKeys.has(key)) continue;
        const record = registered.get(key);
        const financial = FINANCIAL_TYPES.has(fk.childTable as TestDataEntityType);
        if (record?.financialDisposition === "PROTECTED" || (financial && record?.financialDisposition !== "SIMULATED")) {
          protectedKeys.add(key);
          blockers.push({ entityType: fk.childTable, entityId: childId, reason: "Financial evidence is real, protected, or not explicitly classified as simulated." });
          continue;
        }
        if (record || (fk.deleteRule === "CASCADE" && !financial)) {
          changed = addEntity(entities, fk.childTable, childId) || changed;
          if (record) includedRegistry.set(key, record);
          continue;
        }
        if (fk.deleteRule === "RESTRICT" || fk.deleteRule === "NO ACTION") {
          protectedKeys.add(key);
          blockers.push({ entityType: fk.childTable, entityId: childId, reason: "A restricting dependency is not in the verified test-data registry." });
        } else {
          protectedKeys.add(key);
        }
      }
    }
  }
  for (const [type, ids] of entities) {
    if (!FINANCIAL_TYPES.has(type as TestDataEntityType)) continue;
    for (const id of ids) {
      const record = registered.get(`${type}:${id}`);
      if (record?.financialDisposition !== "SIMULATED" || RETAINED_EVIDENCE_TYPES.has(type as TestDataEntityType)) {
        blockers.push({ entityType: type, entityId: id, reason: RETAINED_EVIDENCE_TYPES.has(type as TestDataEntityType) ? "Security and reconciliation evidence is retained; archive or anonymize it separately." : "Financial records require an explicit SIMULATED classification." });
      }
    }
  }
  const serialized = Object.fromEntries([...entities.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([type, ids]) => [type, uniqueSorted(ids)]));
  const counts = Object.fromEntries(Object.entries(serialized).map(([type, ids]) => [type, ids.length]));
  const plan: TestDataCleanupPlan = {
    version: 1, environment, scope, scopeId, generatedAt: new Date().toISOString(), entities: serialized, counts,
    totalDependentRecords: Object.values(counts).reduce((sum, count) => sum + count, 0),
    protectedRecords: protectedKeys.size + blockers.filter((item) => RETAINED_EVIDENCE_TYPES.has(item.entityType as TestDataEntityType)).length,
    deletionOrder: deletionOrderFor(entities, fks), blockers: blockers.filter((item, index, values) => values.findIndex((candidate) => candidate.entityType === item.entityType && candidate.entityId === item.entityId && candidate.reason === item.reason) === index),
    storage: await storageCandidates(db, entities),
    externalIdentities: [...includedRegistry.values()].flatMap((row) => row.entityType === "User" && row.externalProvider === "FIREBASE" && row.externalId && row.externalUserId === row.entityId && row.externalAccountId ? [{ provider: "FIREBASE" as const, externalId: row.externalId, expectedUserId: row.externalUserId, expectedAccountId: row.externalAccountId }] : []).filter((item, index, values) => values.findIndex((candidate) => candidate.provider === item.provider && candidate.externalId === item.externalId) === index),
    registryIds: uniqueSorted([...includedRegistry.values()].map((row) => row.id)),
    batchIds: uniqueSorted([...includedRegistry.values()].map((row) => row.batchId)),
  };
  return plan;
}

function assertSuperAdmin(role: PlatformRole) {
  if (role !== PlatformRole.SUPER_ADMIN) throw new TestDataCleanupError("Only an active super administrator may manage test-data cleanup.", "SUPER_ADMIN_REQUIRED", 403);
}

function isSerializableConflict(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2034";
}

async function retryDelay(attempt: number) {
  await new Promise((resolve) => setTimeout(resolve, Math.min(250, 25 * 2 ** attempt)));
}

export async function runSerializableWithRetries<T>(operation: () => Promise<T>, wait: (attempt: number) => Promise<void> = retryDelay) {
  for (let attempt = 0; attempt < SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isSerializableConflict(error)) throw error;
      if (attempt === SERIALIZABLE_ATTEMPTS - 1) throw new TestDataCleanupError("Cleanup could not obtain a stable serializable transaction after bounded retries.", "SERIALIZATION_RETRIES_EXHAUSTED", 409);
      await wait(attempt);
    }
  }
  throw new TestDataCleanupError("Cleanup transaction did not complete.", "CLEANUP_TRANSACTION_FAILED", 500);
}

async function deletePlannedRows(tx: { $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number> }, plan: TestDataCleanupPlan) {
  const deleted: Record<string, number> = {};
  for (const table of plan.deletionOrder) {
    const ids = plan.entities[table] ?? [];
    if (!ids.length || RETAINED_EVIDENCE_TYPES.has(table as TestDataEntityType)) continue;
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(",");
    const count = await tx.$executeRawUnsafe(`DELETE FROM ${quoteIdentifier(table)} WHERE "id" IN (${placeholders})`, ...ids);
    deleted[table] = count;
  }
  return deleted;
}

export class TestDataCleanupService {
  static environment = currentEnvironment;

  static async overview() {
    const admin = await requireAdminContext("platform:manage");
    assertSuperAdmin(admin.platformRole);
    const environment = currentEnvironment();
    const batches = await prisma.testDataBatch.findMany({
      where: { environment },
      select: { id: true, name: true, status: true, createdAt: true, verifiedAt: true, _count: { select: { records: true } } },
      orderBy: { createdAt: "desc" }, take: 100,
    });
    const roots = await prisma.testDataRegistry.findMany({
      where: { environment, entityType: { in: ["User", "VendorProfile"] }, batch: { status: "VERIFIED", environment } },
      select: { entityType: true, entityId: true, batchId: true }, orderBy: { createdAt: "desc" }, take: 200,
    });
    const accountRoots = roots.filter((row) => row.entityType === "User");
    const shopRoots = roots.filter((row) => row.entityType === "VendorProfile");
    const [users, vendors] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: accountRoots.map((row) => row.entityId) } }, select: { id: true, name: true, email: true } }),
      prisma.vendorProfile.findMany({ where: { id: { in: shopRoots.map((row) => row.entityId) } }, select: { id: true, storeName: true, slug: true } }),
    ]);
    const userById = new Map(users.map((user) => [user.id, user]));
    const vendorById = new Map(vendors.map((vendor) => [vendor.id, vendor]));
    return {
      environment, productionEnabled: false, batches,
      accounts: accountRoots.flatMap((row) => { const user = userById.get(row.entityId); return user ? [{ ...row, name: user.name, email: user.email }] : []; }),
      shops: shopRoots.flatMap((row) => { const vendor = vendorById.get(row.entityId); return vendor ? [{ ...row, name: vendor.storeName, slug: vendor.slug }] : []; }),
    };
  }

  static async createDraftBatch(input: {
    name: string;
    description?: string;
    records: Array<{ entityType: string; entityId: string; financialDisposition?: "NOT_FINANCIAL" | "SIMULATED" | "PROTECTED"; externalIdentity?: { provider: "FIREBASE"; externalId: string } }>;
  }) {
    const admin = await requireAdminContext("platform:manage");
    assertSuperAdmin(admin.platformRole);
    const environment = currentEnvironment();
    if (environment === "PRODUCTION" && process.env.ALLOW_PRODUCTION_TEST_DATA_REGISTRATION !== "true") {
      throw new TestDataCleanupError("Registering new test ownership is disabled in production.", "PRODUCTION_REGISTRATION_DISABLED", 403);
    }
    const name = input.name.trim().slice(0, 120);
    if (name.length < 3 || !input.records.length || input.records.length > 1_000) throw new TestDataCleanupError("Provide a batch name and between 1 and 1,000 explicitly selected records.", "INVALID_BATCH");
    const normalized = input.records.map((record) => ({
      entityType: record.entityType,
      entityId: record.entityId.trim(),
      financialDisposition: record.financialDisposition ?? "NOT_FINANCIAL" as const,
      externalProvider: record.externalIdentity?.provider ?? null,
      externalId: record.externalIdentity?.externalId.trim() || null,
      externalAccountId: null as string | null,
      externalUserId: null as string | null,
    }));
    for (const record of normalized) {
      if (!ENTITY_TYPE_SET.has(record.entityType) || !record.entityId) throw new TestDataCleanupError("The batch contains an unsupported entity.", "INVALID_ENTITY");
      if (FINANCIAL_TYPES.has(record.entityType as TestDataEntityType) && record.financialDisposition === "NOT_FINANCIAL") throw new TestDataCleanupError("Every financial record must be classified as SIMULATED or PROTECTED.", "FINANCIAL_CLASSIFICATION_REQUIRED");
      if ((record.externalProvider || record.externalId) && (record.entityType !== "User" || record.externalProvider !== "FIREBASE" || !record.externalId)) throw new TestDataCleanupError("External identity ownership must be a complete Firebase identity attached to a User record.", "INVALID_EXTERNAL_IDENTITY");
      if (record.externalProvider === "FIREBASE" && record.externalId) {
        const ownership = await resolveFirebaseIdentityOwnership(prisma, record.entityId, record.externalId);
        record.externalAccountId = ownership.accountId;
        record.externalUserId = ownership.userId;
      }
      const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`SELECT EXISTS(SELECT 1 FROM ${quoteIdentifier(record.entityType)} WHERE "id" = $1) AS "exists"`, record.entityId);
      if (!rows[0]?.exists) throw new TestDataCleanupError(`${record.entityType} ${record.entityId} does not exist.`, "ENTITY_NOT_FOUND", 404);
    }
    return prisma.$transaction(async (tx) => {
      const batch = await tx.testDataBatch.create({ data: { name, description: input.description?.trim().slice(0, 2000) || null, environment, createdBy: admin.userId } });
      await tx.testDataRegistry.createMany({ data: normalized.map((record) => ({ ...record, batchId: batch.id, environment, createdBy: admin.userId, ownershipMetadata: { source: "explicit-admin-selection", ...(record.externalId ? { identity: { provider: "firebase", uid: record.externalId, userId: record.externalUserId, accountId: record.externalAccountId } } : {}) } })) });
      await tx.auditLog.create({ data: { userId: admin.userId, action: "TEST_DATA_BATCH_DRAFTED", entity: "TestDataBatch", entityId: batch.id, newValues: { recordCount: normalized.length, environment } } });
      return { id: batch.id, status: batch.status, recordCount: normalized.length };
    });
  }

  static async reviewBatch(input: { batchId: string; decision: "VERIFY" | "REVOKE"; note: string }) {
    const admin = await requireAdminContext("platform:manage");
    assertSuperAdmin(admin.platformRole);
    const environment = currentEnvironment();
    const note = input.note.trim();
    if (note.length < 10) throw new TestDataCleanupError("A meaningful review note is required.", "REVIEW_NOTE_REQUIRED");
    const batch = await prisma.testDataBatch.findFirst({ where: { id: input.batchId, environment } });
    if (!batch || batch.status !== "DRAFT") throw new TestDataCleanupError("Only a draft batch in this environment can be reviewed.", "BATCH_NOT_REVIEWABLE", 409);
    if (environment === "PRODUCTION" && batch.createdBy === admin.userId) throw new TestDataCleanupError("Production test ownership requires independent review by another super administrator.", "INDEPENDENT_REVIEW_REQUIRED", 403);
    const status = input.decision === "VERIFY" ? "VERIFIED" : "REVOKED";
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.testDataBatch.update({ where: { id: batch.id }, data: { status, reviewedBy: admin.userId, reviewNote: note, verifiedAt: status === "VERIFIED" ? new Date() : null, revokedAt: status === "REVOKED" ? new Date() : null } });
      await tx.auditLog.create({ data: { userId: admin.userId, action: `TEST_DATA_BATCH_${status}`, entity: "TestDataBatch", entityId: batch.id, newValues: { note, environment } } });
      return saved;
    });
    return { id: updated.id, status: updated.status };
  }

  static async preview(input: { scope: TestDataCleanupScope; scopeId?: string | null }) {
    const admin = await requireAdminContext("platform:manage");
    assertSuperAdmin(admin.platformRole);
    const environment = currentEnvironment();
    assertTestDataCleanupExecutionAllowed(environment);
    const plan = await buildPlan(prisma, input.scope, input.scopeId ?? null, environment);
    if (plan.entities.User?.includes(admin.userId)) {
      plan.blockers.push({ entityType: "User", entityId: admin.userId, reason: "The super administrator executing cleanup cannot delete their own active account." });
      plan.protectedRecords += 1;
    }
    const planHash = hashCleanupPlan(plan);
    await prisma.testDataCleanupJob.updateMany({
      where: { environment, scope: input.scope, scopeId: input.scopeId ?? null, status: "PLANNED" },
      data: { status: "STALE", error: "Superseded by a newer dry run." },
    });
    const job = await prisma.testDataCleanupJob.create({
      data: { scope: input.scope, scopeId: input.scopeId ?? null, batchId: input.scope === "BATCH" ? input.scopeId : null, environment, plan: plan as unknown as Prisma.InputJsonValue, planHash, requestedBy: admin.userId, expiresAt: new Date(Date.now() + PLAN_TTL_MS) },
      select: { id: true, expiresAt: true },
    }).catch((error: unknown) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new TestDataCleanupError("An active cleanup plan already exists for this scope.", "OVERLAPPING_JOB", 409);
      throw error;
    });
    await prisma.auditLog.create({ data: { userId: admin.userId, action: "TEST_DATA_CLEANUP_PREVIEWED", entity: "TestDataCleanupJob", entityId: job.id, newValues: { scope: input.scope, scopeId: input.scopeId ?? null, planHash, total: plan.totalDependentRecords, blockers: plan.blockers.length } } });
    return { planId: job.id, expiresAt: job.expiresAt.toISOString(), plan };
  }

  static async execute(input: { planId: string; confirmation: string }) {
    const admin = await requireAdminContext("platform:manage");
    assertSuperAdmin(admin.platformRole);
    const environment = currentEnvironment();
    assertTestDataCleanupExecutionAllowed(environment);
    if (input.confirmation !== LARGE_CLEANUP_CONFIRMATION) throw new TestDataCleanupError(`Type ${LARGE_CLEANUP_CONFIRMATION} exactly to continue.`, "CONFIRMATION_REQUIRED");
    const job = await prisma.testDataCleanupJob.findUnique({ where: { id: input.planId } });
    if (!job || job.environment !== environment || job.status !== "PLANNED") throw new TestDataCleanupError("Cleanup plan is unavailable or already used.", "PLAN_UNAVAILABLE", 409);
    if (job.expiresAt <= new Date()) {
      await prisma.testDataCleanupJob.update({ where: { id: job.id }, data: { status: "STALE" } });
      throw new TestDataCleanupError("Cleanup plan expired. Generate a new preview.", "STALE_PLAN", 409);
    }
    try {
      return await runSerializableWithRetries(() => prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`test-data-cleanup:${environment}`}, 0))`;
        const locked = await tx.testDataCleanupJob.findUnique({ where: { id: job.id } });
        if (!locked || locked.status !== "PLANNED") throw new TestDataCleanupError("Cleanup plan was already claimed.", "PLAN_CLAIMED", 409);
        const current = await buildPlan(tx as unknown as typeof prisma, job.scope, job.scopeId, environment);
        if (current.entities.User?.includes(admin.userId)) {
          current.blockers.push({ entityType: "User", entityId: admin.userId, reason: "The super administrator executing cleanup cannot delete their own active account." });
          current.protectedRecords += 1;
        }
        if (current.blockers.length || hashCleanupPlan(current) !== job.planHash) {
          await tx.testDataCleanupJob.update({ where: { id: job.id }, data: { status: "STALE", error: current.blockers.length ? "Cleanup became blocked during revalidation." : "Relevant records changed after preview." } });
          throw new TestDataCleanupError("Cleanup plan is stale or has protected dependencies. Generate a new preview.", "STALE_PLAN", 409);
        }
        await tx.testDataCleanupJob.update({ where: { id: job.id }, data: { status: "RUNNING", confirmation: input.confirmation, startedAt: new Date() } });
        const deleted = await deletePlannedRows(tx, current);
        await tx.testDataRegistry.deleteMany({ where: { id: { in: current.registryIds } } });
        for (const batchId of current.batchIds) {
          const remaining = await tx.testDataRegistry.count({ where: { batchId } });
          if (!remaining) await tx.testDataBatch.update({ where: { id: batchId }, data: { status: "CLEANED", cleanedAt: new Date() } });
        }
        const eligibleStorage = current.storage.filter((item) => !item.shared);
        if (eligibleStorage.length) await tx.storageCleanupTask.createMany({ data: eligibleStorage.map((item) => ({ cleanupJobId: job.id, bucket: item.bucket, objectPath: item.objectPath })), skipDuplicates: true });
        if (current.externalIdentities.length) await tx.externalIdentityCleanupTask.createMany({ data: current.externalIdentities.map((identity) => ({ cleanupJobId: job.id, provider: identity.provider, externalId: identity.externalId, expectedUserId: identity.expectedUserId, expectedAccountId: identity.expectedAccountId })), skipDuplicates: true });
        const result = { deleted, deletedTotal: Object.values(deleted).reduce((sum, count) => sum + count, 0), storageQueued: eligibleStorage.length, storageProtected: current.storage.filter((item) => item.shared).length, identityDeletionsQueued: current.externalIdentities.length };
        await tx.testDataCleanupJob.update({ where: { id: job.id }, data: { status: "COMPLETED", completedAt: new Date(), result } });
        await tx.auditLog.create({ data: { userId: admin.userId, action: "TEST_DATA_CLEANUP_COMPLETED", entity: "TestDataCleanupJob", entityId: job.id, newValues: { planHash: job.planHash, ...result } } });
        return { planId: job.id, ...result };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10_000, timeout: 120_000 }));
    } catch (error) {
      const stale = error instanceof TestDataCleanupError && error.code === "STALE_PLAN";
      await prisma.testDataCleanupJob.updateMany({ where: { id: job.id, status: { in: ["PLANNED", "RUNNING"] } }, data: stale ? { status: "STALE", error: error.message } : { status: "FAILED", failedAt: new Date(), error: error instanceof Error ? error.message.slice(0, 2000) : "Cleanup failed." } });
      if (!stale) {
        await prisma.auditLog.create({ data: { userId: admin.userId, action: "TEST_DATA_CLEANUP_FAILED", entity: "TestDataCleanupJob", entityId: job.id, newValues: { planHash: job.planHash } } }).catch(() => undefined);
      }
      throw error;
    }
  }
}
