"use server";

import { prisma } from "@/lib/prisma/client";
import {
  PlatformRole,
  VendorStatus,
  BillingCycle,
  Prisma,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/client";

/**
 * Platform Governance Security Guard
 * Verifies if an administrative operator is authorized to manage cross-tenant data.
 */
async function verifyPlatformAdminPermission(
  userId: string,
  allowedRoles: PlatformRole[] = [PlatformRole.SUPER_ADMIN, PlatformRole.ADMIN],
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { platformRole: true },
  });

  if (
    !user ||
    !user.platformRole ||
    !allowedRoles.includes(user.platformRole)
  ) {
    throw new Error(
      "Access Denied: Highly privileged operation restricted to platform operations personnel.",
    );
  }

  return user;
}

// ==========================================
// INTERFACES FOR INPUT VALIDATION
// ==========================================

interface ManagePlanInput {
  adminUserId: string;
  planId?: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  currency?: string;
  billingCycle: BillingCycle;
  maxProducts?: number | null;
  commissionRate: number;
  hasPremiumThemes?: boolean;
  hasAdvancedCharts?: boolean;
  isActive?: boolean;
}

interface VendorReviewInput {
  adminUserId: string;
  vendorId: string;
  targetStatus: VendorStatus;
  trialDaysExtension?: number;
}

// ==========================================
// SERVER ACTIONS
// ==========================================

/**
 * Secure Action: Aggregates global marketplace financial performance metrics.
 * Calculates total GMV, aggregate platform commissions, and active vendor counts.
 */
export async function getPlatformOverviewMetrics(adminUserId: string) {
  // Enforce global operator boundary
  await verifyPlatformAdminPermission(adminUserId, [
    PlatformRole.SUPER_ADMIN,
    PlatformRole.ADMIN,
    PlatformRole.BILLING,
    PlatformRole.SUPPORT,
  ]);

  const [
    totalOrdersCount,
    financialAggregates,
    activeVendorsCount,
    pendingVendorsCount,
    activeSubscriptions,
  ] = await Promise.all([
    prisma.order.count({ where: { status: "PAID" } }),

    // Sum total platform revenue metrics from completed sub-orders
    prisma.subOrder.aggregate({
      where: { order: { status: "PAID" } },
      _sum: {
        vendorTotal: true,
        platformCommission: true,
      },
    }),

    prisma.vendorProfile.count({ where: { status: "ACTIVE" } }),
    prisma.vendorProfile.count({ where: { status: "PENDING" } }),

    prisma.vendorSubscription.count({ where: { status: "ACTIVE" } }),
  ]);

  return {
    globalGmv: Number(financialAggregates._sum.vendorTotal || 0),
    platformRevenue: Number(financialAggregates._sum.platformCommission || 0),
    totalPaidOrders: totalOrdersCount,
    metricsDistribution: {
      activeVendors: activeVendorsCount,
      pendingOnboarding: pendingVendorsCount,
      activePaidSubscriptions: activeSubscriptions,
    },
  };
}

/**
 * Secure Action: Modifies a merchant's active platform access state.
 * Handles store activation (calculating free trial windows) or suspension flags.
 */
export async function reviewAndVerifyVendorStatus(input: VendorReviewInput) {
  const {
    adminUserId,
    vendorId,
    targetStatus,
    trialDaysExtension = 14,
  } = input;

  await verifyPlatformAdminPermission(adminUserId, [
    PlatformRole.SUPER_ADMIN,
    PlatformRole.ADMIN,
    PlatformRole.SUPPORT,
  ]);

  const existingVendor = await prisma.vendorProfile.findUnique({
    where: { id: vendorId },
    include: { documents: true },
  });

  if (!existingVendor) {
    throw new Error("Target Vendor Profile reference was not found.");
  }

  const updatePayload: Prisma.VendorProfileUpdateInput = {
    status: targetStatus,
  };

  if (
    targetStatus === VendorStatus.ACTIVE &&
    existingVendor.status === VendorStatus.PENDING
  ) {
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + trialDaysExtension);

    updatePayload.activatedAt = new Date();
    updatePayload.trialEndsAt = trialEnds;
  } else if (targetStatus === VendorStatus.SUSPENDED) {
    updatePayload.suspendedAt = new Date();
  }

  return await prisma.$transaction(async (tx) => {
    const updatedVendor = await tx.vendorProfile.update({
      where: { id: vendorId },
      data: updatePayload,
    });

    // Write audit trail changes
    await tx.auditLog.create({
      data: {
        userId: adminUserId,
        action: `VENDOR_STATUS_MUTATION_${targetStatus}`,
        entity: "VendorProfile",
        entityId: vendorId,
        oldValues: { status: existingVendor.status },
        newValues: { status: targetStatus },
      },
    });

    // Issue platform verification alert down to the target merchant network
    await tx.notification.create({
      data: {
        vendorId,
        type: targetStatus === VendorStatus.ACTIVE ? "SUCCESS" : "ERROR",
        title: `Store Governance Status Updated: ${targetStatus}`,
        message:
          targetStatus === VendorStatus.ACTIVE
            ? `Congratulations! Your store verification documents have been approved. Your ${trialDaysExtension}-day trial phase is now active.`
            : "Your marketplace selling privileges have been suspended. Please review your administrative compliance dashboard.",
      },
    });

    return { success: true, updatedStatus: updatedVendor.status };
  });
}

/**
 * Secure Action: Configures corporate commercial subscription tiers.
 * Directly dictates the future matching platform commission rates captured via checkout routing.
 */
export async function manageSubscriptionPlan(input: ManagePlanInput) {
  const { adminUserId, planId, ...planData } = input;

  await verifyPlatformAdminPermission(adminUserId, [
    PlatformRole.SUPER_ADMIN,
    PlatformRole.BILLING,
  ]);

  const formattedData = {
    name: planData.name,
    slug: planData.slug,
    description: planData.description || null,
    price: new Decimal(planData.price),
    currency: planData.currency || "UGX",
    billingCycle: planData.billingCycle,
    maxProducts:
      planData.maxProducts !== undefined ? planData.maxProducts : null,
    commissionRate: new Decimal(planData.commissionRate),
    hasPremiumThemes: !!planData.hasPremiumThemes,
    hasAdvancedCharts: !!planData.hasAdvancedCharts,
    isActive: planData.isActive !== undefined ? planData.isActive : true,
  };

  return await prisma.$transaction(async (tx) => {
    let savedPlan;

    if (planId) {
      // Keep an administrative record of what configuration changed
      const oldPlan = await tx.subscriptionPlan.findUnique({
        where: { id: planId },
      });

      savedPlan = await tx.subscriptionPlan.update({
        where: { id: planId },
        data: formattedData,
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: "SUBSCRIPTION_PLAN_UPDATED",
          entity: "SubscriptionPlan",
          entityId: planId,
          oldValues: JSON.parse(JSON.stringify(oldPlan)),
          newValues: JSON.parse(JSON.stringify(savedPlan)),
        },
      });
    } else {
      savedPlan = await tx.subscriptionPlan.create({
        data: formattedData,
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: "SUBSCRIPTION_PLAN_CREATED",
          entity: "SubscriptionPlan",
          entityId: savedPlan.id,
          newValues: JSON.parse(JSON.stringify(savedPlan)),
        },
      });
    }

    return { success: true, planId: savedPlan.id };
  });
}

/**
 * Secure Action: Returns historical activity trails for forensic system auditing.
 */
export async function getPlatformAuditLogs(
  adminUserId: string,
  page = 1,
  pageSize = 50,
) {
  await verifyPlatformAdminPermission(adminUserId, [PlatformRole.SUPER_ADMIN]);

  const skip = (page - 1) * pageSize;

  const [logs, totalCount] = await Promise.all([
    prisma.auditLog.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        vendor: { select: { storeName: true } },
      },
    }),
    prisma.auditLog.count(),
  ]);

  return {
    logs,
    pagination: {
      currentPage: page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
      totalEntries: totalCount,
    },
  };
}
