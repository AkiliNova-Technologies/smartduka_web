import { prisma } from "@/lib/prisma/client";
import { serializeMarketplaceProduct } from "@/services/product";

const CANDIDATE_LIMIT = 72;
const MAX_PER_VENDOR = 2;
const MAX_PER_CATEGORY = 3;

export type RecommendationInput = {
  userId?: string | null;
  recentProductIds?: string[];
  cartProductIds?: string[];
  excludeProductIds?: string[];
  limit?: number;
};

/**
 * Private, deterministic ranking. Public candidate products are fetched once;
 * customer signals are resolved separately and never enter a shared cache key.
 */
export class RecommendationService {
  static async getRecommendations(input: RecommendationInput) {
    const limit = Math.min(Math.max(input.limit ?? 8, 1), 12);
    const localRecentIds = [...new Set(input.recentProductIds ?? [])].slice(0, 24);
    const cartIds = [...new Set(input.cartProductIds ?? [])].slice(0, 50);
    const [persistedRecent, wishlist] = input.userId
      ? await Promise.all([
          prisma.recentlyViewed.findMany({ where: { userId: input.userId }, orderBy: { viewedAt: "desc" }, take: 24, select: { productId: true } }),
          prisma.wishlistItem.findMany({ where: { userId: input.userId }, take: 50, select: { productId: true } }),
        ])
      : [[], []];
    const recentIds = [...new Set([...persistedRecent.map((item) => item.productId), ...localRecentIds])];
    const signalIds = [...new Set([...recentIds, ...wishlist.map((item) => item.productId), ...cartIds])];
    const signals = signalIds.length
      ? await prisma.product.findMany({ where: { id: { in: signalIds } }, select: { id: true, categoryId: true, subCategoryId: true, vendorId: true, basePrice: true } })
      : [];
    const recentSet = new Set(recentIds);
    const wishlistSet = new Set(wishlist.map((item) => item.productId));
    const cartSet = new Set(cartIds);
    const categoryScore = new Map<string, number>();
    const vendorScore = new Map<string, number>();
    const prices: number[] = [];
    for (const signal of signals) {
      const weight = recentSet.has(signal.id) ? 12 : wishlistSet.has(signal.id) ? 8 : cartSet.has(signal.id) ? 6 : 0;
      const deepest = signal.subCategoryId ?? signal.categoryId;
      if (deepest) categoryScore.set(deepest, (categoryScore.get(deepest) ?? 0) + weight);
      if (signal.categoryId) categoryScore.set(signal.categoryId, (categoryScore.get(signal.categoryId) ?? 0) + Math.ceil(weight / 2));
      vendorScore.set(signal.vendorId, (vendorScore.get(signal.vendorId) ?? 0) + Math.ceil(weight / 2));
      prices.push(Number(signal.basePrice));
    }
    const exclusions = new Set([...(input.excludeProductIds ?? []), ...cartIds]);
    const candidates = await prisma.product.findMany({
      where: { id: { notIn: [...exclusions] }, status: { in: ["ACTIVE", "PUBLISHED"] }, deletedAt: null, vendor: { status: "ACTIVE", deletedAt: null } },
      include: {
        images: { take: 1, orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }] },
        vendor: { select: { id: true, storeName: true, slug: true } },
        category: { select: { id: true, name: true, slug: true, parent: { select: { id: true, name: true, slug: true } } } },
        subCategory: { select: { id: true, name: true, slug: true, parent: { select: { id: true, name: true, slug: true } } } },
        variants: { select: { isActive: true, inventoryCount: true, price: true, options: true } },
        reviews: { where: { status: "PUBLISHED" }, select: { rating: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: CANDIDATE_LIMIT,
    });
    const averagePrice = prices.length ? prices.reduce((sum, price) => sum + price, 0) / prices.length : null;
    const ranked = candidates.map((candidate) => {
      const deepest = candidate.subCategoryId ?? candidate.categoryId;
      const rating = candidate.reviews.length ? candidate.reviews.reduce((sum, review) => sum + review.rating, 0) / candidate.reviews.length : 0;
      const priceAffinity = averagePrice && Math.abs(Number(candidate.basePrice) - averagePrice) / averagePrice < .35 ? 2 : 0;
      return { candidate, score: (deepest ? categoryScore.get(deepest) ?? 0 : 0) + (candidate.categoryId ? categoryScore.get(candidate.categoryId) ?? 0 : 0) + (vendorScore.get(candidate.vendorId) ?? 0) + priceAffinity + rating / 10 };
    }).sort((a, b) => b.score - a.score || b.candidate.createdAt.getTime() - a.candidate.createdAt.getTime() || a.candidate.id.localeCompare(b.candidate.id));
    const vendorCounts = new Map<string, number>(), categoryCounts = new Map<string, number>();
    const products = ranked.flatMap(({ candidate }) => {
      const category = candidate.subCategoryId ?? candidate.categoryId ?? "uncategorized";
      if ((vendorCounts.get(candidate.vendorId) ?? 0) >= MAX_PER_VENDOR || (categoryCounts.get(category) ?? 0) >= MAX_PER_CATEGORY) return [];
      vendorCounts.set(candidate.vendorId, (vendorCounts.get(candidate.vendorId) ?? 0) + 1);
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
      return [serializeMarketplaceProduct(candidate as unknown as Record<string, unknown>)];
    }).slice(0, limit);
    return { products, personalized: signalIds.length > 0 };
  }
}
