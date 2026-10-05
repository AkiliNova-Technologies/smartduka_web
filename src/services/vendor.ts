import { prisma } from "@/lib/prisma/client";
import { VerificationStatus, Prisma } from "@prisma/client";
import { cacheLife, cacheTag } from "next/cache";
import { cacheProfiles, cacheTags } from "@/lib/cache-policy";
import { serializeMarketplaceProduct } from "@/services/product";
import { ReviewService } from "@/services/reviews";
import type { MarketplaceProduct } from "@/components/marketplace/product-card";
import {
  serializePublicShopListing,
  type PublicShopListing,
} from "@/lib/public-shop-dto";

// ==========================================
// TYPES
// ==========================================

export interface VendorApplicationWithUser {
  id: string;
  userId: string;
  storeName: string;
  storeSlug: string;
  businessType: string;
  registrationNumber: string | null;
  taxId: string | null;
  businessEmail: string;
  businessPhone: string;
  website: string | null;
  streetAddress: string;
  city: string;
  district: string | null;
  country: string;
  hasPhysicalStore: boolean;
  storeLocation: string | null;
  momoNetwork: string | null;
  momoNumber: string | null;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  status: VerificationStatus;
  reviewerNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
  };
  documents: {
    id: string;
    type: string;
    name: string;
    url: string;
    status: string;
  }[];
}

export interface VendorApplicationFilters {
  status?: VerificationStatus;
  search?: string;
}

export type PublicShopDetail = {
  store: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    banner: string | null;
    verified: boolean;
    description: string | null;
    city: string | null;
    country: string | null;
    returnWindowDays: number;
    returnPolicy: string | null;
    acceptsExchanges: boolean;
    exchangePolicy: string | null;
    totalProducts: number;
    rating: number;
    reviewCount: number;
    reviews: {
      id: string;
      rating: number;
      comment: string | null;
      customer: string;
      reply: string | null;
      createdAt: string;
    }[];
    joinedAt: string;
  };
  products: Array<MarketplaceProduct & {
    categoryId: string | null;
    subCategoryName: string | null;
  }>;
  categories: { id: string; name: string }[];
};

// ==========================================
// VENDOR SERVICE
// ==========================================

export class VendorService {
  /**
   * Get a user's vendor application by userId
   */
  static async getMyApplication(userId: string) {
    return prisma.vendorApplication.findUnique({
      where: { userId },
      include: {
        documents: { orderBy: { createdAt: "desc" } },
      },
    });
  }

  /**
   * Get all vendor applications (admin)
   */
  static async getAllApplications(filters?: VendorApplicationFilters) {
    const where: Prisma.VendorApplicationWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { storeName: { contains: filters.search, mode: "insensitive" } },
        { storeSlug: { contains: filters.search, mode: "insensitive" } },
        {
          businessEmail: { contains: filters.search, mode: "insensitive" },
        },
      ];
    }

    return prisma.vendorApplication.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
        documents: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    }) as Promise<VendorApplicationWithUser[]>;
  }

  /**
   * Update application status (admin)
   */
  static async updateApplicationStatus(
    applicationId: string,
    status: VerificationStatus,
    reviewerNotes?: string,
    reviewedBy?: string
  ) {
    const application = await prisma.vendorApplication.update({
      where: { id: applicationId },
      data: {
        status,
        reviewerNotes: reviewerNotes || null,
        reviewedBy: reviewedBy || null,
        reviewedAt: new Date(),
      },
    });

    // If approved, create or update the VendorProfile
    if (status === "APPROVED") {
      await prisma.vendorProfile.upsert({
        where: { ownerId: application.userId },
        update: {
          storeName: application.storeName,
          slug: application.storeSlug,
          email: application.businessEmail,
          phone: application.businessPhone,
          website: application.website,
          address: application.streetAddress,
          city: application.city,
          country: application.country,
          status: "ACTIVE",
          activatedAt: new Date(),
        },
        create: {
          ownerId: application.userId,
          storeName: application.storeName,
          slug: application.storeSlug,
          registrationNumber: application.registrationNumber,
          email: application.businessEmail,
          phone: application.businessPhone,
          website: application.website,
          address: application.streetAddress,
          city: application.city,
          country: application.country,
          status: "ACTIVE",
          activatedAt: new Date(),
        },
      });

      // Link the application to the vendor profile
      const vendorProfile = await prisma.vendorProfile.findUnique({
        where: { ownerId: application.userId },
      });

      if (vendorProfile) {
        await prisma.vendorApplication.update({
          where: { id: applicationId },
          data: { vendorProfileId: vendorProfile.id },
        });

        // Update user's vendor role
        await prisma.user.update({
          where: { id: application.userId },
          data: {
            vendorId: vendorProfile.id,
            vendorRole: "OWNER",
            platformRole: "VENDOR",
          },
        });
      }
    }

    return application;
  }

  /**
   * Get vendor profile by ID
   */
  static async getVendorProfile(vendorId: string) {
    return prisma.vendorProfile.findUnique({
      where: { id: vendorId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        _count: { select: { products: true, subOrders: true } },
      },
    });
  }

  /**
   * Get vendor profile by owner userId
   */
  static async getVendorProfileByOwner(userId: string) {
    return prisma.vendorProfile.findUnique({
      where: { ownerId: userId },
      include: {
        _count: { select: { products: true, subOrders: true } },
      },
    });
  }

  /**
   * Get all active vendor profiles for the public shops/stores listing page.
   * The cache always contains the serialized, client-safe card DTO.
   */
  static async getPublicStoreListings(): Promise<PublicShopListing[]> {
    "use cache";
    cacheLife(cacheProfiles.marketplace);
    cacheTag(cacheTags.marketplace.shops);
    const vendors = await prisma.vendorProfile.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
      },
      select: {
        id: true,
        storeName: true,
        slug: true,
        logoUrl: true,
        bannerUrl: true,
        description: true,
        city: true,
        country: true,
        verificationStatus: true,
        fulfillmentMethods: true,
        deliveryFee: true,
        deliveryEstimate: true,
        _count: { select: { products: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return vendors.map(serializePublicShopListing);
  }

  /** Public storefront data only. The slug argument is part of this cache entry's identity. */
  static async getPublicShopBySlug(vendorSlug: string): Promise<PublicShopDetail | null> {
    "use cache";
    cacheLife(cacheProfiles.marketplace);
    cacheTag(cacheTags.marketplace.shops, cacheTags.shopSlug(vendorSlug));
    const vendorProfile = await prisma.vendorProfile.findUnique({
      where: { slug: vendorSlug, status: "ACTIVE", deletedAt: null },
      select: {
        id: true,
        storeName: true,
        slug: true,
        logoUrl: true,
        bannerUrl: true,
        verificationStatus: true,
        description: true,
        city: true,
        country: true,
        returnWindowDays: true,
        returnPolicy: true,
        acceptsExchanges: true,
        exchangePolicy: true,
        createdAt: true,
        products: {
          where: { status: { in: ["ACTIVE", "PUBLISHED"] }, deletedAt: null },
          select: {
            id: true, name: true, slug: true, brand: true, basePrice: true,
            compareAtPrice: true, inventoryCount: true, vendorId: true,
            categoryId: true, createdAt: true,
            images: { select: { url: true }, orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }] },
            category: { select: { id: true, name: true, slug: true, parent: { select: { id: true, name: true, slug: true, parent: { select: { id: true, name: true, slug: true } } } } } },
            subCategory: { select: { id: true, name: true, slug: true, parent: { select: { id: true, name: true, slug: true, parent: { select: { id: true, name: true, slug: true } } } } } },
            variants: { select: { isActive: true, inventoryCount: true, price: true } },
            reviews: { where: { status: "PUBLISHED" }, select: { rating: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { products: true } },
      },
    });
    if (!vendorProfile) return null;
    cacheTag(cacheTags.shop(vendorProfile.id));
    const [reviewSummary, shopReviews] = await Promise.all([ReviewService.shopSummary(vendorProfile.id), ReviewService.publicShopReviews(vendorProfile.id)]);
    const categories = Array.from(new Map(vendorProfile.products.filter((product) => product.category).map((product) => [product.category!.id, { id: product.category!.id, name: product.category!.name }])).values());
    const products = vendorProfile.products.map((product) => ({ ...serializeMarketplaceProduct({ ...product, vendor: { storeName: vendorProfile.storeName } }), categoryId: product.categoryId, subCategoryName: product.subCategory?.name ?? null }));
    return {
      store: {
        id: vendorProfile.id, name: vendorProfile.storeName, slug: vendorProfile.slug, logo: vendorProfile.logoUrl, banner: vendorProfile.bannerUrl || null, verified: vendorProfile.verificationStatus === "VERIFIED",
        description: vendorProfile.description || null,
        city: vendorProfile.city || "Kampala", country: vendorProfile.country || "Uganda", returnWindowDays: vendorProfile.returnWindowDays, returnPolicy: vendorProfile.returnPolicy,
        acceptsExchanges: vendorProfile.acceptsExchanges, exchangePolicy: vendorProfile.exchangePolicy, totalProducts: vendorProfile._count.products, rating: reviewSummary.average, reviewCount: reviewSummary.count,
        reviews: shopReviews.map((review) => ({ id: review.id, rating: review.rating, comment: review.comment, customer: review.user.name, reply: review.vendorReplies[0]?.body ?? null, createdAt: review.createdAt.toISOString() })), joinedAt: vendorProfile.createdAt.toISOString(),
      }, products, categories,
    };
  }
}
