import { Prisma, VendorStatus, VerificationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import {
  ShopModerationError,
  resolveShopModerationState,
  transitionShopModerationState,
  type ShopModerationAction,
} from "@/lib/shop-moderation-state";

export * from "@/lib/shop-moderation-state";

function isRetryableConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

export class ShopModerationService {
  static async transition(input: {
    applicationId: string;
    action: ShopModerationAction;
    reason?: string | null;
    actorId: string;
  }) {
    const reason = input.reason?.trim() || null;
    if (["REJECT", "SUSPEND", "BAN"].includes(input.action) && (!reason || reason.length < 3))
      throw new ShopModerationError("A clear moderation reason is required.", "REASON_REQUIRED");

    try {
      return await prisma.$transaction(async (tx) => {
        const application = await tx.vendorApplication.findUnique({
          where: { id: input.applicationId },
          include: { vendorProfile: { select: { id: true, slug: true, status: true } } },
        });
        if (!application) throw new ShopModerationError("Shop application not found.", "NOT_FOUND");

        const current = resolveShopModerationState(application.status, application.vendorProfile?.status);
        const next = transitionShopModerationState(current, input.action);
        const now = new Date();
        let vendorId = application.vendorProfile?.id ?? null;
        let vendorSlug = application.vendorProfile?.slug ?? null;

        if (input.action === "APPROVE") {
          const claimed = await tx.vendorApplication.updateMany({
            where: { id: application.id, status: application.status },
            data: { status: VerificationStatus.APPROVED, reviewerNotes: reason, reviewedBy: input.actorId, reviewedAt: now },
          });
          if (claimed.count !== 1) throw new ShopModerationError("The shop changed while it was being reviewed.", "CONCURRENT_MODIFICATION");
          const vendor = await tx.vendorProfile.upsert({
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
              status: VendorStatus.ACTIVE,
              activatedAt: now,
              suspendedAt: null,
              bannedAt: null,
              moderationReason: null,
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
              status: VendorStatus.ACTIVE,
              activatedAt: now,
            },
          });
          vendorId = vendor.id;
          vendorSlug = vendor.slug;
          await tx.vendorApplication.update({ where: { id: application.id }, data: { vendorProfileId: vendor.id } });
          await tx.user.update({ where: { id: application.userId }, data: { vendorId: vendor.id, vendorRole: "OWNER", platformRole: "VENDOR" } });
        } else if (input.action === "REJECT") {
          const claimed = await tx.vendorApplication.updateMany({
            where: { id: application.id, status: application.status },
            data: { status: VerificationStatus.REJECTED, reviewerNotes: reason, reviewedBy: input.actorId, reviewedAt: now },
          });
          if (claimed.count !== 1) throw new ShopModerationError("The shop changed while it was being reviewed.", "CONCURRENT_MODIFICATION");
        } else {
          if (!application.vendorProfile) throw new ShopModerationError("Operational shop profile not found.", "NOT_FOUND");
          const expected = input.action === "RESTORE" || input.action === "BAN"
            ? application.vendorProfile.status
            : VendorStatus.ACTIVE;
          const target = input.action === "RESTORE"
            ? VendorStatus.ACTIVE
            : input.action === "SUSPEND"
              ? VendorStatus.SUSPENDED
              : VendorStatus.BANNED;
          const claimed = await tx.vendorProfile.updateMany({
            where: { id: application.vendorProfile.id, status: expected },
            data: {
              status: target,
              moderationReason: reason,
              suspendedAt: target === VendorStatus.SUSPENDED ? now : null,
              bannedAt: target === VendorStatus.BANNED ? now : null,
            },
          });
          if (claimed.count !== 1) throw new ShopModerationError("The shop changed while it was being moderated.", "CONCURRENT_MODIFICATION");
        }

        await tx.auditLog.create({
          data: {
            vendorId,
            userId: input.actorId,
            action: `SHOP_${input.action}`,
            entity: vendorId ? "VendorProfile" : "VendorApplication",
            entityId: vendorId ?? application.id,
            oldValues: { moderationState: current },
            newValues: { moderationState: next, reason },
          },
        });
        const messages: Record<ShopModerationAction, { type: "SUCCESS" | "WARNING" | "ERROR"; title: string; message: string }> = {
          APPROVE: { type: "SUCCESS", title: "Seller application approved", message: "Your seller application has been approved. You can now access your vendor dashboard and start managing your shop." },
          REJECT: { type: "ERROR", title: "Seller application needs attention", message: reason ? `Your seller application was not approved: ${reason}` : "Your seller application was not approved. Review your application for details." },
          SUSPEND: { type: "WARNING", title: "Shop suspended", message: reason || "Your shop has been temporarily suspended." },
          RESTORE: { type: "SUCCESS", title: "Shop restored", message: "Your shop has been restored and eligible listings are public again." },
          BAN: { type: "ERROR", title: "Shop banned", message: reason || "Your shop is no longer permitted to operate on Mwezora." },
        };
        await tx.notification.create({ data: {
          vendorId,
          userId: application.userId,
          ...messages[input.action],
          actionPath: input.action === "APPROVE" ? "/vendor" : input.action === "REJECT" ? "/become-seller" : undefined,
          idempotencyKey: `seller-application:${application.id}:${input.action.toLowerCase()}`,
        } });
        return { applicationId: application.id, vendorId, vendorSlug, previousState: current, state: next };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (isRetryableConflict(error))
        throw new ShopModerationError("The shop changed while it was being moderated. Refresh and try again.", "CONCURRENT_MODIFICATION");
      throw error;
    }
  }
}
