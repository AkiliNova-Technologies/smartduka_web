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
    const [totalUsers, totalCustomers, totalVendors, totalAdmins, totalOrders, totalProducts, activeShops, totalRevenue] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { platformRole: "CUSTOMER" } }),
      prisma.user.count({ where: { platformRole: "VENDOR" } }),
      prisma.user.count({ where: { platformRole: { in: ["ADMIN", "SUPER_ADMIN"] } } }),
      prisma.order.count(),
      prisma.product.count({ where: { deletedAt: null } }),
      prisma.vendorProfile.count({ where: { status: "ACTIVE", deletedAt: null } }),
      // Marketplace sales only include successfully completed payments.
      prisma.subOrder.aggregate({ where: { order: { paymentStatus: "COMPLETED" } }, _sum: { vendorTotal: true } }),
    ]);
    return { totalUsers, totalCustomers, totalVendors, totalAdmins, totalOrders, totalProducts, activeShops, totalRevenue: Number(totalRevenue._sum.vendorTotal || 0) };
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
            id: true, orderNumber: true, shippingAddress: true, shippingPhone: true, notes: true,
            paymentGateway: true, paymentStatus: true, subTotal: true, totalShipping: true, createdAt: true,
            customer: { select: { name: true, email: true } },
            paymentAttempts: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, status: true, providerStatus: true, paymentMethod: true, confirmationCode: true, verifiedAt: true, lastVerifiedAt: true } },
            riskFlags: { where: { status: "OPEN" }, select: { status: true } },
          },
        },
        vendor: { select: { storeName: true } },
        items: { include: { product: { select: { name: true } }, variant: { select: { name: true } } } },
        returnRequests: { select: { status: true } },
        refunds: { select: { status: true } },
        disputes: { select: { status: true } },
        riskFlags: { where: { status: "OPEN" }, select: { status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const findingRows = await prisma.reconciliationFinding.findMany({
      where: { status: "OPEN", OR: [{ subOrderId: { in: subOrders.map((order) => order.id) } }, { orderId: { in: subOrders.map((order) => order.orderId) } }] },
      select: { subOrderId: true, orderId: true, type: true },
    });
    const findings = new Map<string, string[]>();
    for (const finding of findingRows) {
      for (const entityId of [finding.subOrderId, finding.orderId]) {
        if (entityId) findings.set(entityId, [...(findings.get(entityId) || []), finding.type]);
      }
    }
    return subOrders.map((so) => {
      const attempt = so.order.paymentAttempts[0] || null;
      return {
        id: so.id, orderId: so.order.id, orderNumber: so.subOrderNumber,
        customerName: so.order.customer?.name || "Customer", customerEmail: so.order.customer?.email || "", customerPhone: so.order.shippingPhone,
        storeName: so.vendor?.storeName || "Unknown Store", totalAmount: Number(so.vendorTotal), subTotal: Number(so.order.subTotal), totalShipping: Number(so.order.totalShipping),
        paymentGateway: so.order.paymentGateway, paymentStatus: so.order.paymentStatus, subOrderStatus: so.status,
        deliveryLocation: so.order.shippingAddress || "", notes: so.order.notes, date: so.order.createdAt.toISOString(),
        items: so.items.map((item) => ({ id: item.id, name: item.productNameSnapshot ?? item.product.name, quantity: item.quantity, unitPrice: Number(item.priceAtPurchase), lineTotal: Number(item.totalPrice), variant: item.variantNameSnapshot ?? item.variant?.name ?? null })),
        paymentAttempt: attempt ? { id: attempt.id, status: attempt.status, providerStatus: attempt.providerStatus, paymentMethod: attempt.paymentMethod, confirmationCode: attempt.confirmationCode, verifiedAt: (attempt.verifiedAt || attempt.lastVerifiedAt)?.toISOString() || null } : null,
        issues: { returns: so.returnRequests.map((item) => item.status), refunds: so.refunds.map((item) => item.status), disputes: so.disputes.map((item) => item.status), riskFlags: [...so.riskFlags, ...so.order.riskFlags].map((item) => item.status), financialExceptions: [...(findings.get(so.id) || []), ...(findings.get(so.order.id) || [])] },
      };
    });
  }
}
