import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    storePublication: { create: vi.fn(), findFirst: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findMany: vi.fn() },
    storePublicationProduct: { deleteMany: vi.fn() },
    storePublicationEvent: { upsert: vi.fn() },
    auditLog: { create: vi.fn(), createMany: vi.fn() },
  };
  return {
    context: vi.fn(), entitlement: vi.fn(), transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)), tx,
    productCount: vi.fn(), followCount: vi.fn(), followMany: vi.fn(), publicationCount: vi.fn(), publicationMany: vi.fn(),
  };
});

vi.mock("@/lib/auth/vendor-context", () => ({ requireVendorContext: mocks.context }));
vi.mock("@/services/vendor-entitlement", () => ({ VendorEntitlementService: { getForShop: mocks.entitlement } }));
vi.mock("@/lib/prisma/client", () => ({ prisma: {
  $transaction: mocks.transaction,
  product: { count: mocks.productCount },
  storeFollow: { count: mocks.followCount, findMany: mocks.followMany },
  storePublication: { count: mocks.publicationCount, findMany: mocks.publicationMany },
} }));

import { StorePublicationService } from "@/services/store-publications";

const owner = { user: { id: "owner-a", vendorRole: "OWNER" }, vendor: { id: "vendor-a" }, vendorId: "vendor-a", vendorRole: "OWNER" };
const draft = { id: "publication-a", vendorId: "vendor-a", kind: "ANNOUNCEMENT", status: "DRAFT", title: "Opening hours", body: "We are open later.", products: [], publicationEvent: null };

describe("StorePublicationService", () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.context.mockResolvedValue(owner); mocks.entitlement.mockResolvedValue({ capabilities: { ADVERTISING_ACCESS: true } }); mocks.productCount.mockResolvedValue(0);
    mocks.tx.auditLog.create.mockResolvedValue({}); mocks.tx.auditLog.createMany.mockResolvedValue({ count: 0 }); mocks.tx.storePublicationEvent.upsert.mockResolvedValue({ id: "event-a" });
  });

  it("returns aggregate audience metrics without follower identities", async () => {
    vi.spyOn(StorePublicationService, "advanceLifecycle").mockResolvedValueOnce({ published: 0, expired: 0 });
    mocks.followCount.mockResolvedValueOnce(12).mockResolvedValueOnce(3).mockResolvedValueOnce(7);
    mocks.publicationCount.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    mocks.followMany.mockResolvedValue([{ createdAt: new Date() }]);
    const result = await StorePublicationService.metrics();
    expect(result).toMatchObject({ totalFollowers: 12, newFollowers7Days: 3, newFollowers30Days: 7, publishedAnnouncements: 2, activeCampaigns: 1, engagement: null });
    expect(mocks.followMany).toHaveBeenCalledWith(expect.objectContaining({ select: { createdAt: true } }));
  });

  it("creates a vendor-scoped announcement draft and audit record", async () => {
    mocks.tx.storePublication.create.mockResolvedValue(draft);
    await expect(StorePublicationService.create({ kind: "ANNOUNCEMENT", title: "Opening hours", body: "We are open later." })).resolves.toEqual(draft);
    expect(mocks.tx.storePublication.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ vendorId: "vendor-a", createdById: "owner-a" }) }));
    expect(mocks.tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ vendorId: "vendor-a", action: "STORE_PUBLICATION_CREATED" }) }));
  });

  it("rejects cross-vendor campaign products", async () => {
    mocks.productCount.mockResolvedValue(0);
    await expect(StorePublicationService.create({ kind: "FOLLOWER_CAMPAIGN", title: "New collection", body: "See our new collection.", productIds: ["11111111-1111-4111-8111-111111111111"] })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.tx.storePublication.create).not.toHaveBeenCalled();
  });

  it("blocks campaign publication when the subscription lacks advertising access", async () => {
    mocks.tx.storePublication.findFirst.mockResolvedValue({ ...draft, kind: "FOLLOWER_CAMPAIGN", status: "IN_REVIEW", expiresAt: null, scheduledAt: null });
    mocks.entitlement.mockResolvedValue({ capabilities: { ADVERTISING_ACCESS: false } });
    await expect(StorePublicationService.publish("publication-a")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.tx.storePublicationEvent.upsert).not.toHaveBeenCalled();
  });

  it("prevents managers from bypassing owner/admin review", async () => {
    mocks.context.mockResolvedValue({ ...owner, user: { id: "manager-a", vendorRole: "MANAGER" }, vendorRole: "MANAGER" });
    await expect(StorePublicationService.publish("publication-a")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("publishes reviewed content and upserts one non-delivery event", async () => {
    mocks.tx.storePublication.findFirst.mockResolvedValue({ ...draft, status: "IN_REVIEW", expiresAt: null, scheduledAt: null });
    mocks.tx.storePublication.update.mockResolvedValue({}); mocks.tx.storePublication.findUniqueOrThrow.mockResolvedValue({ ...draft, status: "PUBLISHED" });
    await StorePublicationService.publish("publication-a", new Date("2026-11-04T10:00:00Z"));
    expect(mocks.tx.storePublicationEvent.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { publicationId: "publication-a" }, create: expect.objectContaining({ notificationEligible: true, eventKey: "store-publication:publication-a:published" }) }));
  });

  it("advances scheduled publications and expires old content", async () => {
    mocks.tx.storePublication.findMany.mockResolvedValueOnce([{ id: "due-a", vendorId: "vendor-a" }]).mockResolvedValueOnce([{ id: "expired-a", vendorId: "vendor-a" }]);
    mocks.tx.storePublication.updateMany.mockResolvedValue({ count: 1 });
    await expect(StorePublicationService.advanceLifecycle(new Date("2026-11-04T10:00:00Z"))).resolves.toEqual({ published: 1, expired: 1 });
    expect(mocks.tx.storePublicationEvent.upsert).toHaveBeenCalledTimes(1);
    expect(mocks.tx.auditLog.createMany).toHaveBeenCalled();
  });
});
