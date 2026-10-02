import { prisma } from "@/lib/prisma/client";
import { requireAdminContext } from "@/lib/auth/admin-context";
import { PayoutReadinessService } from "@/services/payout-readiness";

const payoutSelect = {
  id: true, amount: true, currency: true, status: true, maskedDestination: true, destinationType: true,
  createdAt: true, updatedAt: true, approvedAt: true, rejectedAt: true, cancelledAt: true, readyAt: true, processedAt: true,
  vendor: { select: { id: true, storeName: true, status: true, owner: { select: { name: true, email: true } } } },
} as const;

export class AdminFinanceService {
  static async listWithdrawals() {
    await requireAdminContext("platform:manage_billing");
    return prisma.vendorPayout.findMany({ select: payoutSelect, orderBy: { createdAt: "desc" }, take: 100 });
  }

  static async getWithdrawal(id: string) {
    await requireAdminContext("platform:manage_billing");
    const payout = await prisma.vendorPayout.findUnique({
      where: { id },
      select: { ...payoutSelect, allocations: { select: { allocatedAmount: true, status: true }, orderBy: { createdAt: "asc" } } },
    });
    if (!payout) return null;
    const readiness = await PayoutReadinessService.evaluateWithdrawalDisbursementEligibility(id);
    return { ...payout, allocationSummary: { count: payout.allocations.length, activeCount: payout.allocations.filter((item) => item.status === "ACTIVE").length }, readiness };
  }

  static async listPayments() {
    await requireAdminContext("platform:manage_billing");
    return prisma.paymentAttempt.findMany({
      select: { id: true, orderId: true, gateway: true, amount: true, currency: true, status: true, providerStatus: true, createdAt: true, initiatedAt: true, verifiedAt: true, completedAt: true, reversedAt: true, order: { select: { orderNumber: true, paymentStatus: true, status: true, customer: { select: { name: true, email: true } } } } },
      orderBy: { createdAt: "desc" }, take: 100,
    });
  }

  static async getPayment(id: string) {
    await requireAdminContext("platform:manage_billing");
    return prisma.paymentAttempt.findUnique({
      where: { id },
      select: { id: true, orderId: true, gateway: true, amount: true, currency: true, status: true, providerStatus: true, merchantReference: true, providerTrackingId: true, confirmationCode: true, paymentMethod: true, createdAt: true, initiatedAt: true, verifiedAt: true, lastVerifiedAt: true, completedAt: true, reversedAt: true, order: { select: { orderNumber: true, paymentStatus: true, status: true, customer: { select: { name: true, email: true } } } } },
    });
  }
}
