import { prisma } from "@/lib/prisma/client";
import { PlatformRole, UserStatus, VerificationStatus } from "@prisma/client";

export class AdminService {
  static async getAllUsers(options?: {
    search?: string;
    role?: PlatformRole;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: Record<string, unknown> = {};
    if (options?.role) where.platformRole = options.role;
    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: "insensitive" as const } },
        { email: { contains: options.search, mode: "insensitive" as const } },
      ];
    }
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, phone: true, avatarUrl: true,
          platformRole: true, vendorRole: true, status: true,
          emailVerifiedAt: true, lastLoginAt: true, createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      prisma.user.count({ where }),
    ]);
    return { users, total };
  }

  static async getUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, phone: true, avatarUrl: true,
        platformRole: true, vendorRole: true, vendorId: true, status: true,
        emailVerifiedAt: true, lastLoginAt: true, createdAt: true,
      },
    });
  }

  static async updateUserRole(userId: string, platformRole: PlatformRole, updatedBy: string) {
    const user = await prisma.user.update({ where: { id: userId }, data: { platformRole } });
    await prisma.auditLog.create({
      data: { userId: updatedBy, action: "USER_ROLE_UPDATED", entity: "User", entityId: userId, newValues: { platformRole } },
    });
    return user;
  }

  static async updateUserStatus(userId: string, status: UserStatus, updatedBy: string) {
    const user = await prisma.user.update({ where: { id: userId }, data: { status } });
    await prisma.auditLog.create({
      data: { userId: updatedBy, action: "USER_STATUS_UPDATED", entity: "User", entityId: userId, newValues: { status } },
    });
    return user;
  }

  static async getPlatformMetrics() {
    const [totalUsers, totalCustomers, totalVendors, totalAdmins, totalOrders, totalProducts, totalRevenue] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { platformRole: "CUSTOMER" } }),
      prisma.user.count({ where: { platformRole: "VENDOR" } }),
      prisma.user.count({ where: { platformRole: { in: ["ADMIN", "SUPER_ADMIN"] } } }),
      prisma.order.count(),
      prisma.product.count({ where: { deletedAt: null } }),
      prisma.subOrder.aggregate({ where: { order: { status: "PAID" } }, _sum: { vendorTotal: true } }),
    ]);
    return { totalUsers, totalCustomers, totalVendors, totalAdmins, totalOrders, totalProducts, totalRevenue: Number(totalRevenue._sum.vendorTotal || 0) };
  }

   static async getAllVendorApplications(filters?: { status?: VerificationStatus; search?: string }) {
    const where: Record<string, unknown> = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.search) {
      where.OR = [
        { storeName: { contains: filters.search, mode: "insensitive" as const } },
        { storeSlug: { contains: filters.search, mode: "insensitive" as const } },
        { businessEmail: { contains: filters.search, mode: "insensitive" as const } },
      ];
    }
    return prisma.vendorApplication.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
        documents: { orderBy: { createdAt: "desc" } },
        vendorProfile: { select: { logoUrl: true, bannerUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getVendorApplicationById(applicationId: string) {
    return prisma.vendorApplication.findUnique({
      where: { id: applicationId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
        documents: { orderBy: { createdAt: "desc" } },
      },
    });
  }

  static async verifyVendor(applicationId: string, status: VerificationStatus, reviewerNotes: string | null, reviewedBy: string) {
    const application = await prisma.vendorApplication.update({
      where: { id: applicationId },
      data: { status, reviewerNotes, reviewedBy, reviewedAt: new Date() },
    });
    if (status === "APPROVED") {
      await prisma.vendorProfile.upsert({
        where: { ownerId: application.userId },
        update: {
          storeName: application.storeName, slug: application.storeSlug,
          email: application.businessEmail, phone: application.businessPhone,
          website: application.website, address: application.streetAddress,
          city: application.city, country: application.country,
          status: "ACTIVE", activatedAt: new Date(),
        },
        create: {
          ownerId: application.userId, storeName: application.storeName,
          slug: application.storeSlug, registrationNumber: application.registrationNumber,
          email: application.businessEmail, phone: application.businessPhone,
          website: application.website, address: application.streetAddress,
          city: application.city, country: application.country,
          status: "ACTIVE", activatedAt: new Date(),
        },
      });
      const vendorProfile = await prisma.vendorProfile.findUnique({ where: { ownerId: application.userId } });
      if (vendorProfile) {
        await prisma.vendorApplication.update({ where: { id: applicationId }, data: { vendorProfileId: vendorProfile.id } });
        await prisma.user.update({ where: { id: application.userId }, data: { vendorId: vendorProfile.id, vendorRole: "OWNER", platformRole: "VENDOR" } });
      }
    }
    await prisma.auditLog.create({
      data: { userId: reviewedBy, action: `VENDOR_${status}`, entity: "VendorApplication", entityId: applicationId, newValues: { status } },
    });
    return application;
  }

    static async getAllOrders() {
    const subOrders = await prisma.subOrder.findMany({
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerId: true,
            customer: { select: { name: true, email: true } },
            shippingAddress: true,
            paymentGateway: true,
            createdAt: true,
          },
        },
        vendor: { select: { storeName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return subOrders.map((so) => ({
      id: so.id,
      orderNumber: so.subOrderNumber,
      customerName: so.order.customer?.name || "Customer",
      customerEmail: so.order.customer?.email || "",
      storeName: so.vendor?.storeName || "Unknown Store",
      totalAmount: Number(so.vendorTotal),
      paymentGateway: so.order.paymentGateway,
      subOrderStatus: so.status,
      deliveryLocation: so.order.shippingAddress || "",
      date: so.createdAt.toISOString(),
    }));
  }
}