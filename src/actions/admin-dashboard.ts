"use server";

import { prisma } from "@/lib/prisma/client";
import { VendorStatus, BillingCycle } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/client";
import { requireAdminContext } from "@/lib/auth/admin-context";
import { ShopModerationService, resolveShopModerationState, type ShopModerationAction } from "@/services/shop-moderation";
import { revalidatePath, revalidateTag } from "next/cache";
import { cacheTags } from "@/lib/cache-policy";

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
  reason?: string;
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
  const { vendorId, targetStatus } = input;
  const existingVendor = await prisma.vendorProfile.findUnique({ where: { id: vendorId }, include: { vendorApplication: true } });
  if (!existingVendor) throw new Error("Target Vendor Profile reference was not found.");
  if (!existingVendor.vendorApplication) throw new Error("The shop has no linked application history.");
  const current = resolveShopModerationState(existingVendor.vendorApplication.status, existingVendor.status);
  const action: ShopModerationAction | null =
    targetStatus === VendorStatus.ACTIVE ? (current === "SUSPENDED" ? "RESTORE" : current === "PENDING" ? "APPROVE" : null)
      : targetStatus === VendorStatus.SUSPENDED ? "SUSPEND"
        : targetStatus === VendorStatus.BANNED ? "BAN"
          : null;
  if (!action) throw new Error("Unsupported or invalid shop moderation transition.");
  const result = await ShopModerationService.transition({ applicationId: existingVendor.vendorApplication.id, action, reason: input.reason, actorId: admin.userId });
  revalidatePath("/admin/vendors");
  revalidateTag(cacheTags.marketplace.shops, "max");
  revalidateTag(cacheTags.marketplace.products, "max");
  revalidateTag(cacheTags.marketplace.discovery, "max");
  revalidateTag(cacheTags.marketplace.promotions, "max");
  revalidateTag(cacheTags.shop(existingVendor.id), "max");
  revalidateTag(cacheTags.shopSlug(existingVendor.slug), "max");
  return { success: true, updatedStatus: result.state };
}

export async function manageSubscriptionPlan(input: ManagePlanInput) {
  const admin = await requireAdminContext("platform:manage_billing");
  const { planId, ...planData } = input;
  const formattedData = {
    name: planData.name, slug: planData.slug, code: planData.slug.toUpperCase(), description: planData.description || null,
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
