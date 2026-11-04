import { prisma } from "@/lib/prisma/client";
import { publicShopWhere } from "@/lib/marketplace-eligibility";

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
    const where = { vendor: { followers: { some: { customerId } }, ...publicShopWhere }, status: { in: ["ACTIVE", "PUBLISHED"] as ("ACTIVE" | "PUBLISHED")[] }, deletedAt: null };
    const [rows, total] = await Promise.all([
      prisma.product.findMany({ where, select: { id: true, name: true, slug: true, createdAt: true, images: { select: { url: true }, orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }], take: 1 }, vendor: { select: { id: true, storeName: true, slug: true, logoUrl: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize }),
      prisma.product.count({ where }),
    ]);
    return { items: rows.map((row) => ({ id: `product:${row.id}`, type: "NEW_PRODUCT" as const, publishedAt: row.createdAt.toISOString(), title: row.name, description: `${row.vendor.storeName} added a new product.`, imageUrl: row.images[0]?.url ?? null, destinationPath: `/products/${row.slug}`, store: row.vendor })), total };
  }
}
