import { prisma } from "@/lib/prisma/client";
import { publicShopWhere } from "@/lib/marketplace-eligibility";
import { StorePublicationKind, StorePublicationStatus } from "@prisma/client";

export class StoreFollowingError extends Error {
  constructor(message: string, readonly code: "NOT_FOUND" | "FORBIDDEN" = "NOT_FOUND") { super(message); }
}

const shopSelect = {
  id: true, storeName: true, slug: true, logoUrl: true, description: true,
  city: true, country: true, verificationStatus: true,
  _count: { select: { followers: true } },
} as const;

const serialize = (vendor: { id: string; storeName: string; slug: string; logoUrl: string | null; description: string | null; city: string | null; country: string | null; verificationStatus: string; _count: { followers: number } }) => ({
  id: vendor.id, storeName: vendor.storeName, slug: vendor.slug, logoUrl: vendor.logoUrl,
  description: vendor.description, city: vendor.city, country: vendor.country,
  isVerified: vendor.verificationStatus === "VERIFIED", followerCount: vendor._count.followers,
});

export class StoreFollowingService {
  static async state(customerId: string, vendorId: string) {
    const vendor = await prisma.vendorProfile.findFirst({ where: { id: vendorId, ...publicShopWhere }, select: { id: true, _count: { select: { followers: true } } } });
    if (!vendor) throw new StoreFollowingError("Shop not found.");
    const follow = await prisma.storeFollow.findUnique({ where: { customerId_vendorId: { customerId, vendorId } }, select: { id: true } });
    return { following: Boolean(follow), followerCount: vendor._count.followers };
  }

  static async follow(customerId: string, vendorId: string) {
    const vendor = await prisma.vendorProfile.findFirst({ where: { id: vendorId, ...publicShopWhere }, select: { id: true } });
    if (!vendor) throw new StoreFollowingError("This shop is unavailable.");
    await prisma.storeFollow.upsert({ where: { customerId_vendorId: { customerId, vendorId } }, update: {}, create: { customerId, vendorId } });
    return this.state(customerId, vendorId);
  }

  static async unfollow(customerId: string, vendorId: string) {
    await prisma.storeFollow.deleteMany({ where: { customerId, vendorId } });
    const vendor = await prisma.vendorProfile.findFirst({ where: { id: vendorId, ...publicShopWhere }, select: { _count: { select: { followers: true } } } });
    return { following: false, followerCount: vendor?._count.followers ?? 0 };
  }

  static async list(customerId: string, page: number, pageSize: number) {
    const where = { customerId, vendor: publicShopWhere };
    const [rows, total] = await Promise.all([
      prisma.storeFollow.findMany({ where, select: { createdAt: true, vendor: { select: shopSelect } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize }),
      prisma.storeFollow.count({ where }),
    ]);
    return { items: rows.map((row) => ({ ...serialize(row.vendor), followedAt: row.createdAt.toISOString() })), total };
  }

  static async activity(customerId: string, page: number, pageSize: number) {
    const now = new Date(), offset = (page - 1) * pageSize, take = offset + pageSize;
    const vendorFilter = { followers: { some: { customerId } }, ...publicShopWhere };
    const productWhere = { vendor: vendorFilter, status: { in: ["ACTIVE", "PUBLISHED"] as ("ACTIVE" | "PUBLISHED")[] }, deletedAt: null };
    const publicationWhere = { vendor: vendorFilter, status: StorePublicationStatus.PUBLISHED, publishedAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
    const [products, publications, productTotal, publicationTotal] = await Promise.all([
      prisma.product.findMany({ where: productWhere, select: { id: true, name: true, slug: true, createdAt: true, images: { select: { url: true }, orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }], take: 1 }, vendor: { select: { id: true, storeName: true, slug: true, logoUrl: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take }),
      prisma.storePublication.findMany({ where: publicationWhere, select: { id: true, kind: true, title: true, body: true, imageUrl: true, destination: true, destinationProduct: { select: { slug: true } }, publishedAt: true, vendor: { select: { id: true, storeName: true, slug: true, logoUrl: true } } }, orderBy: [{ publishedAt: "desc" }, { id: "desc" }], take }),
      prisma.product.count({ where: productWhere }), prisma.storePublication.count({ where: publicationWhere }),
    ]);
    const items = [
      ...products.map(row => ({ id: `product:${row.id}`, type: "NEW_PRODUCT" as const, publishedAt: row.createdAt.toISOString(), title: row.name, description: `${row.vendor.storeName} added a new product.`, imageUrl: row.images[0]?.url ?? null, destinationPath: `/products/${row.slug}`, store: row.vendor })),
      ...publications.map(row => ({ id: `publication:${row.id}`, type: row.kind === StorePublicationKind.ANNOUNCEMENT ? "ANNOUNCEMENT" as const : "FOLLOWER_CAMPAIGN" as const, publishedAt: row.publishedAt!.toISOString(), title: row.title, description: row.body, imageUrl: row.imageUrl, destinationPath: row.destination === "PRODUCT" && row.destinationProduct ? `/products/${row.destinationProduct.slug}` : `/shops/${row.vendor.slug}`, store: row.vendor })),
    ].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || b.id.localeCompare(a.id)).slice(offset, offset + pageSize);
    return { items, total: productTotal + publicationTotal };
  }
}
