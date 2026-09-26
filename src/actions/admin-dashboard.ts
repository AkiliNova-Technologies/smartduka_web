"use server";

import { prisma } from "@/lib/prisma/client";
import { VendorStatus, BillingCycle, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/client";
import { requireAdminContext } from "@/lib/auth/admin-context";

interface ManagePlanInput {
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
  vendorId: string;
  targetStatus: VendorStatus;
  trialDaysExtension?: number;
}

export async function getPlatformOverviewMetrics() {
  await requireAdminContext("platform:view_analytics");
  const [totalOrdersCount, financialAggregates, activeVendorsCount, pendingVendorsCount, activeSubscriptions] = await Promise.all([
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.subOrder.aggregate({ where: { order: { status: "PAID" } }, _sum: { vendorTotal: true, platformCommission: true } }),
    prisma.vendorProfile.count({ where: { status: "ACTIVE" } }),
    prisma.vendorProfile.count({ where: { status: "PENDING" } }),
    prisma.vendorSubscription.count({ where: { status: "ACTIVE" } }),
  ]);
  return {
    globalGmv: Number(financialAggregates._sum.vendorTotal || 0),
    platformRevenue: Number(financialAggregates._sum.platformCommission || 0),
    totalPaidOrders: totalOrdersCount,
    metricsDistribution: { activeVendors: activeVendorsCount, pendingOnboarding: pendingVendorsCount, activePaidSubscriptions: activeSubscriptions },
  };
}

export async function reviewAndVerifyVendorStatus(input: VendorReviewInput) {
  const admin = await requireAdminContext("platform:manage_vendors");
  const { vendorId, targetStatus, trialDaysExtension = 14 } = input;
  const existingVendor = await prisma.vendorProfile.findUnique({ where: { id: vendorId }, include: { documents: true } });
  if (!existingVendor) throw new Error("Target Vendor Profile reference was not found.");

  const updatePayload: Prisma.VendorProfileUpdateInput = { status: targetStatus };
  if (targetStatus === VendorStatus.ACTIVE && existingVendor.status === VendorStatus.PENDING) {
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + trialDaysExtension);
    updatePayload.activatedAt = new Date();
    updatePayload.trialEndsAt = trialEnds;
  } else if (targetStatus === VendorStatus.SUSPENDED) {
    updatePayload.suspendedAt = new Date();
  }

  return prisma.$transaction(async (tx) => {
    const updatedVendor = await tx.vendorProfile.update({ where: { id: vendorId }, data: updatePayload });
    await tx.auditLog.create({
      data: { userId: admin.userId, action: `VENDOR_STATUS_MUTATION_${targetStatus}`, entity: "VendorProfile", entityId: vendorId, oldValues: { status: existingVendor.status }, newValues: { status: targetStatus } },
    });
    await tx.notification.create({
      data: {
        vendorId, type: targetStatus === VendorStatus.ACTIVE ? "SUCCESS" : "ERROR",
        title: `Store Governance Status Updated: ${targetStatus}`,
        message: targetStatus === VendorStatus.ACTIVE
          ? `Congratulations! Your store verification documents have been approved. Your ${trialDaysExtension}-day trial phase is now active.`
          : "Your marketplace selling privileges have been suspended. Please review your administrative compliance dashboard.",
      },
    });
    return { success: true, updatedStatus: updatedVendor.status };
  });
}

export async function manageSubscriptionPlan(input: ManagePlanInput) {
  const admin = await requireAdminContext("platform:manage_billing");
  const { planId, ...planData } = input;
  const formattedData = {
    name: planData.name, slug: planData.slug, description: planData.description || null,
    price: new Decimal(planData.price), currency: planData.currency || "UGX", billingCycle: planData.billingCycle,
    maxProducts: planData.maxProducts !== undefined ? planData.maxProducts : null,
    commissionRate: new Decimal(planData.commissionRate), hasPremiumThemes: !!planData.hasPremiumThemes,
    hasAdvancedCharts: !!planData.hasAdvancedCharts, isActive: planData.isActive !== undefined ? planData.isActive : true,
  };
  return prisma.$transaction(async (tx) => {
    let savedPlan;
    if (planId) {
      const oldPlan = await tx.subscriptionPlan.findUnique({ where: { id: planId } });
      savedPlan = await tx.subscriptionPlan.update({ where: { id: planId }, data: formattedData });
      await tx.auditLog.create({ data: { userId: admin.userId, action: "SUBSCRIPTION_PLAN_UPDATED", entity: "SubscriptionPlan", entityId: planId, oldValues: JSON.parse(JSON.stringify(oldPlan)), newValues: JSON.parse(JSON.stringify(savedPlan)) } });
    } else {
      savedPlan = await tx.subscriptionPlan.create({ data: formattedData });
      await tx.auditLog.create({ data: { userId: admin.userId, action: "SUBSCRIPTION_PLAN_CREATED", entity: "SubscriptionPlan", entityId: savedPlan.id, newValues: JSON.parse(JSON.stringify(savedPlan)) } });
    }
    return { success: true, planId: savedPlan.id };
  });
}

export async function getPlatformAuditLogs(page = 1, pageSize = 50) {
  await requireAdminContext("platform:manage");
  const skip = (page - 1) * pageSize;
  const [logs, totalCount] = await Promise.all([
    prisma.auditLog.findMany({ skip, take: pageSize, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true, email: true } }, vendor: { select: { storeName: true } } } }),
    prisma.auditLog.count(),
  ]);
  return { logs, pagination: { currentPage: page, pageSize, totalPages: Math.ceil(totalCount / pageSize), totalEntries: totalCount } };
}
