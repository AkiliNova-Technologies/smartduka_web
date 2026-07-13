import { prisma } from "@/lib/prisma/client";
import { VerificationStatus, Prisma } from "@prisma/client";

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

export const vendorService = {
  /**
   * Get a user's vendor application by userId
   */
  async getMyApplication(userId: string) {
    const application = await prisma.vendorApplication.findUnique({
      where: { userId },
      include: {
        documents: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return application;
  },

  /**
   * Get all vendor applications (admin)
   */
  async getAllApplications(filters?: {
    status?: VerificationStatus;
    search?: string;
  }) {
    const where: Prisma.VendorApplicationWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { storeName: { contains: filters.search, mode: "insensitive" } },
        { storeSlug: { contains: filters.search, mode: "insensitive" } },
        { businessEmail: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const applications = await prisma.vendorApplication.findMany({
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
        documents: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return applications as VendorApplicationWithUser[];
  },

  /**
   * Update application status (admin)
   */
  async updateApplicationStatus(
    applicationId: string,
    status: VerificationStatus,
    reviewerNotes?: string,
    reviewedBy?: string,
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
          momoMerchantCode: application.momoNumber || null,
          bankAccountName: application.bankAccountName || null,
          bankAccountNumber: application.bankAccountNumber || null,
          bankName: application.bankName || null,
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
          momoMerchantCode: application.momoNumber || null,
          bankAccountName: application.bankAccountName || null,
          bankAccountNumber: application.bankAccountNumber || null,
          bankName: application.bankName || null,
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
  },

  /**
   * Get vendor profile by ID
   */
  async getVendorProfile(vendorId: string) {
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
        _count: {
          select: {
            products: true,
            subOrders: true,
          },
        },
      },
    });
  },

  /**
   * Get vendor profile by owner userId
   */
  async getVendorProfileByOwner(userId: string) {
    return prisma.vendorProfile.findUnique({
      where: { ownerId: userId },
      include: {
        _count: {
          select: {
            products: true,
            subOrders: true,
          },
        },
      },
    });
  },

  /**
   * Get all active vendor profiles for the public brands/stores listing page
   */
  async getPublicStoreListings() {
    const vendorProfiles = await prisma.vendorProfile.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
      },
      include: {
        _count: {
          select: { products: true },
        },
        products: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: {
            images: {
              take: 1,
              orderBy: { sortOrder: "asc" },
              select: { url: true },
            },
            categoryId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return vendorProfiles;
  },
};
