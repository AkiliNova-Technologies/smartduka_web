import { MarketplaceReportSeverity, MarketplaceReportStatus, PlatformRole, ShopVerificationActivityType, ShopVerificationStatus, UserStatus } from "@prisma/client";
import { requireAdminContext } from "@/lib/auth/admin-context";
import { requireVendorContext } from "@/lib/auth/vendor-context";
import { prisma } from "@/lib/prisma/client";
import { cacheTags } from "@/lib/cache-policy";
import { revalidateTag } from "next/cache";

export class ShopVerificationError extends Error {
  constructor(message: string, public code = "INVALID") { super(message); }
}

const activeStatuses: ShopVerificationStatus[] = ["PENDING", "UNDER_REVIEW", "NEEDS_INFORMATION"];
const adminRoles = [PlatformRole.SUPER_ADMIN, PlatformRole.ADMIN, PlatformRole.SUPPORT];
const clean = (value: unknown, max = 4000) => typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";
const actionPath = "/vendor/settings/verification";

function notification(status: ShopVerificationStatus, publicId: string) {
  const copy: Partial<Record<ShopVerificationStatus, [string, string, "INFO" | "SUCCESS" | "WARNING"]>> = {
    PENDING: ["Verification application received", "Your shop verification application has been received.", "INFO"],
    UNDER_REVIEW: ["Verification under review", "Your shop verification application is now under review.", "INFO"],
    NEEDS_INFORMATION: ["Information needed", "We need additional information to continue verifying your shop.", "WARNING"],
    VERIFIED: ["Shop verified", "Your shop has been verified by SmartDuka.", "SUCCESS"],
    REJECTED: ["Verification not approved", "Your shop verification application was not approved. Review the details and update your information before reapplying.", "WARNING"],
    SUSPENDED: ["Verification suspended", "Your shop verification status has been temporarily suspended.", "WARNING"],
    REVOKED: ["Verification revoked", "Your shop verification status has been revoked.", "WARNING"],
  };
  return copy[status] ?? ["Verification update", `Your shop verification case ${publicId} was updated.`, "INFO"];
}

function activityFor(status: ShopVerificationStatus): ShopVerificationActivityType {
  return ({ UNDER_REVIEW: "REVIEW_STARTED", NEEDS_INFORMATION: "INFORMATION_REQUESTED", VERIFIED: "APPROVED", REJECTED: "REJECTED", SUSPENDED: "SUSPENDED", REVOKED: "REVOKED" } as Partial<Record<ShopVerificationStatus, ShopVerificationActivityType>>)[status] ?? "APPLICATION_SUBMITTED";
}

export class ShopVerificationService {
  static async checkEligibility() {
    const context = await requireVendorContext("vendor:manage_shop");
    const vendor = await prisma.vendorProfile.findUnique({ where: { id: context.vendorId }, include: { vendorApplication: { include: { documents: true } }, verificationApplications: { where: { status: { in: activeStatuses } }, select: { id: true } } } });
    if (!vendor) throw new ShopVerificationError("Shop not found.", "NOT_FOUND");
    const missing: string[] = [];
    if (vendor.status !== "ACTIVE") missing.push("ACTIVE_SHOP");
    if (!vendor.storeName.trim()) missing.push("SHOP_NAME");
    if (!vendor.email || !vendor.phone) missing.push("BUSINESS_CONTACT");
    if (!vendor.description?.trim()) missing.push("SHOP_DESCRIPTION");
    if (!vendor.address?.trim()) missing.push("BUSINESS_ADDRESS");
    if (vendor.vendorApplication?.status !== "APPROVED") missing.push("KYC_APPROVAL");
    if (vendor.verificationApplications.length) missing.push("ACTIVE_APPLICATION");
    return { eligible: missing.length === 0, missing, vendorId: vendor.id };
  }

  static async getForVendor() {
    const context = await requireVendorContext("vendor:manage_shop");
    const [eligibility, application] = await Promise.all([
      this.checkEligibility(),
      prisma.shopVerificationApplication.findFirst({ where: { vendorId: context.vendorId }, orderBy: { createdAt: "desc" }, include: { activities: { where: { type: { in: ["APPLICATION_SUBMITTED", "REVIEW_STARTED", "INFORMATION_REQUESTED", "INFORMATION_PROVIDED", "APPROVED", "REJECTED", "SUSPENDED", "REINSTATED", "REVOKED"] } }, orderBy: { createdAt: "asc" } } } }),
    ]);
    if (!application) return { eligibility, application: null };
    const { assignedAdminId: _assigned, assignedById: _assignedBy, decisionById: _decision, ...safe } = application;
    return { eligibility, application: safe };
  }

  static async submit() {
    const context = await requireVendorContext("vendor:manage_shop");
    const eligibility = await this.checkEligibility();
    if (!eligibility.eligible) throw new ShopVerificationError(`Complete these requirements first: ${eligibility.missing.join(", ")}.`, "INELIGIBLE");
    const vendor = await prisma.vendorProfile.findUniqueOrThrow({ where: { id: context.vendorId }, include: { vendorApplication: { select: { storeName: true, businessType: true, registrationNumber: true, taxId: true, status: true } } } });
    const publicId = `VFY-${new Date().getUTCFullYear()}-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
    const snapshot = { shopName: vendor.storeName, legalName: vendor.vendorApplication?.storeName ?? vendor.storeName, contact: { email: vendor.email, phone: vendor.phone }, address: vendor.address, city: vendor.city, registrationNumber: vendor.vendorApplication?.registrationNumber ?? vendor.registrationNumber, taxId: vendor.vendorApplication?.taxId ?? null, kycStatus: vendor.vendorApplication?.status ?? "UNAVAILABLE", businessType: vendor.vendorApplication?.businessType ?? null };
    const created = await prisma.$transaction(async (tx) => {
      const application = await tx.shopVerificationApplication.create({ data: { publicId, vendorId: vendor.id, submittedById: context.user.id, snapshot } });
      await tx.vendorProfile.update({ where: { id: vendor.id }, data: { verificationStatus: "PENDING", isVerified: false, verifiedAt: null } });
      await tx.shopVerificationActivity.create({ data: { applicationId: application.id, actorId: context.user.id, type: "APPLICATION_SUBMITTED", toValue: "PENDING" } });
      const [title, message, type] = notification("PENDING", publicId);
      await tx.notification.create({ data: { userId: vendor.ownerId, vendorId: vendor.id, type, title, message, actionPath } });
      await tx.auditLog.create({ data: { vendorId: vendor.id, userId: context.user.id, action: "SHOP_VERIFICATION_SUBMITTED", entity: "ShopVerificationApplication", entityId: application.id, newValues: { status: "PENDING", publicId } } });
      return application;
    });
    revalidateTag(cacheTags.marketplace.shops, "max");
    revalidateTag(cacheTags.shop(vendor.id), "max");
    revalidateTag(cacheTags.shopSlug(vendor.slug), "max");
    return created;
  }

  static async provideInformation(body: string) {
    const context = await requireVendorContext("vendor:manage_shop"); const text = clean(body);
    if (text.length < 10) throw new ShopVerificationError("Please provide enough information for the reviewer.");
    const application = await prisma.shopVerificationApplication.findFirst({ where: { vendorId: context.vendorId, status: "NEEDS_INFORMATION" } });
    if (!application) throw new ShopVerificationError("There is no verification request awaiting information.", "NOT_FOUND");
    const updated = await prisma.$transaction(async tx => {
      const updated = await tx.shopVerificationApplication.update({ where: { id: application.id }, data: { status: "UNDER_REVIEW", vendorResponse: text, informationRequest: null } });
      await tx.vendorProfile.update({ where: { id: context.vendorId }, data: { verificationStatus: "UNDER_REVIEW" } });
      await tx.shopVerificationActivity.create({ data: { applicationId: application.id, actorId: context.user.id, type: "INFORMATION_PROVIDED", fromValue: "NEEDS_INFORMATION", toValue: "UNDER_REVIEW" } });
      await tx.auditLog.create({ data: { vendorId: context.vendorId, userId: context.user.id, action: "SHOP_VERIFICATION_INFORMATION_PROVIDED", entity: "ShopVerificationApplication", entityId: application.id } });
      return updated;
    });
    return updated;
  }

  static async eligibleAdmins() { await requireAdminContext("platform:manage_verifications"); return prisma.user.findMany({ where: { status: UserStatus.ACTIVE, platformRole: { in: adminRoles } }, select: { id: true, name: true, email: true, platformRole: true }, orderBy: { name: "asc" } }); }

  static async listForAdmin(input: { status?: ShopVerificationStatus; assignedAdminId?: string; unassigned?: boolean; view?: string; page?: number; limit?: number } = {}) {
    const admin = await requireAdminContext("platform:manage_verifications"); const page = Math.max(1, input.page ?? 1), limit = Math.min(100, Math.max(1, input.limit ?? 25)); const where: any = { ...(input.status ? { status: input.status } : {}), ...(input.assignedAdminId ? { assignedAdminId: input.assignedAdminId } : {}), ...(input.unassigned ? { assignedAdminId: null } : {}) };
    if (input.view === "mine") where.assignedAdminId = admin.userId; if (input.view === "unassigned") where.assignedAdminId = null; if (input.view === "new") where.status = "PENDING"; if (input.view === "needs-information") where.status = "NEEDS_INFORMATION";
    const [items, total, pending, reviewing, needsInformation, verified, suspended] = await prisma.$transaction([prisma.shopVerificationApplication.findMany({ where, include: { vendor: { select: { storeName: true, slug: true, owner: { select: { name: true, email: true } } } }, assignedAdmin: { select: { name: true } } }, orderBy: { submittedAt: "desc" }, skip: (page - 1) * limit, take: limit }), prisma.shopVerificationApplication.count({ where }), prisma.shopVerificationApplication.count({ where: { status: "PENDING" } }), prisma.shopVerificationApplication.count({ where: { status: "UNDER_REVIEW" } }), prisma.shopVerificationApplication.count({ where: { status: "NEEDS_INFORMATION" } }), prisma.shopVerificationApplication.count({ where: { status: "VERIFIED" } }), prisma.shopVerificationApplication.count({ where: { status: "SUSPENDED" } })]);
    return { items, total, page, limit, metrics: { pending, reviewing, needsInformation, verified, suspended } };
  }

  static async getForAdmin(id: string) {
    await requireAdminContext("platform:manage_verifications");
    const application = await prisma.shopVerificationApplication.findUnique({ where: { id }, include: { vendor: { include: { owner: { select: { name: true, email: true } }, vendorApplication: { select: { status: true, documents: { select: { type: true, status: true, name: true } } }, }, marketplaceReports: { where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "AWAITING_INFORMATION", "ACTION_REQUIRED"] } }, select: { severity: true } }, riskFlags: { where: { status: "OPEN" }, select: { severity: true, category: true } } } }, assignedAdmin: { select: { name: true, email: true } }, activities: { include: { actor: { select: { name: true } } }, orderBy: { createdAt: "asc" } }, notes: { include: { admin: { select: { name: true } } }, orderBy: { createdAt: "asc" } } } });
    if (!application) return null;
    const severeReports = application.vendor.marketplaceReports.filter(report => report.severity === MarketplaceReportSeverity.HIGH || report.severity === MarketplaceReportSeverity.CRITICAL).length;
    return { ...application, context: { openReports: application.vendor.marketplaceReports.length, severeReports, openRiskFlags: application.vendor.riskFlags.length } };
  }

  static async assign(id: string, assignedAdminId: string) {
    const actor = await requireAdminContext("platform:manage_verifications"); const assignee = await prisma.user.findFirst({ where: { id: assignedAdminId, status: UserStatus.ACTIVE, platformRole: { in: adminRoles } }, select: { id: true } }); if (!assignee) throw new ShopVerificationError("Choose an eligible active administrator.");
    const application = await prisma.shopVerificationApplication.findUnique({ where: { id } }); if (!application) throw new ShopVerificationError("Verification application not found.", "NOT_FOUND");
    return prisma.$transaction(async tx => { const updated = await tx.shopVerificationApplication.update({ where: { id }, data: { assignedAdminId, assignedById: actor.userId, assignedAt: new Date() } }); await tx.shopVerificationActivity.create({ data: { applicationId: id, actorId: actor.userId, type: application.assignedAdminId ? "REASSIGNED" : "ASSIGNED", fromValue: application.assignedAdminId, toValue: assignedAdminId } }); await tx.notification.create({ data: { userId: assignedAdminId, type: "WARNING", title: "Verification assigned", message: `${application.publicId} has been assigned to you.`, actionPath: `/admin/verifications/${id}` } }); await tx.auditLog.create({ data: { vendorId: application.vendorId, userId: actor.userId, action: "SHOP_VERIFICATION_ASSIGNED", entity: "ShopVerificationApplication", entityId: id, newValues: { assignedAdminId } } }); return updated; });
  }

  static async transition(id: string, target: ShopVerificationStatus, reason?: string) {
    const actor = await requireAdminContext("platform:manage_verifications"); const text = clean(reason); const application = await prisma.shopVerificationApplication.findUnique({ where: { id }, include: { vendor: { select: { ownerId: true, slug: true } } } }); if (!application) throw new ShopVerificationError("Verification application not found.", "NOT_FOUND");
    const allowed: Partial<Record<ShopVerificationStatus, ShopVerificationStatus[]>> = { PENDING: ["UNDER_REVIEW"], UNDER_REVIEW: ["NEEDS_INFORMATION", "VERIFIED", "REJECTED"], NEEDS_INFORMATION: ["UNDER_REVIEW"], VERIFIED: ["SUSPENDED", "REVOKED"], SUSPENDED: ["VERIFIED", "REVOKED"] };
    if (!allowed[application.status]?.includes(target)) throw new ShopVerificationError("That verification transition is not allowed.");
    if (["NEEDS_INFORMATION", "REJECTED", "SUSPENDED", "REVOKED"].includes(target) && text.length < 3) throw new ShopVerificationError("A clear reason is required.");
    if (target === "VERIFIED") { const missing = await this.eligibilityForVendor(application.vendorId); if (missing.length) throw new ShopVerificationError(`This shop is no longer eligible: ${missing.join(", ")}.`); }
    const updated = await prisma.$transaction(async tx => {
      const now = new Date(); const update: any = { status: target, ...(target === "UNDER_REVIEW" && !application.reviewStartedAt ? { reviewStartedAt: now } : {}), ...(target === "VERIFIED" ? { decisionById: actor.userId, decidedAt: now, verifiedAt: now } : {}), ...(target === "REJECTED" ? { decisionById: actor.userId, decidedAt: now, rejectionReason: text } : {}), ...(target === "NEEDS_INFORMATION" ? { informationRequest: text } : {}), ...(target === "SUSPENDED" ? { suspensionReason: text } : {}), ...(target === "REVOKED" ? { revocationReason: text, decisionById: actor.userId, decidedAt: now } : {}) };
      const updated = await tx.shopVerificationApplication.update({ where: { id }, data: update }); const verified = target === "VERIFIED";
      await tx.vendorProfile.update({ where: { id: application.vendorId }, data: { verificationStatus: target, isVerified: verified, verifiedAt: verified ? now : null } });
      await tx.shopVerificationActivity.create({ data: { applicationId: id, actorId: actor.userId, type: target === "VERIFIED" && application.status === "SUSPENDED" ? "REINSTATED" : activityFor(target), fromValue: application.status, toValue: target, metadata: text ? { reason: text } : undefined } });
      const [title, message, type] = notification(target, application.publicId); await tx.notification.create({ data: { userId: application.vendor.ownerId, vendorId: application.vendorId, type, title, message, actionPath } });
      await tx.auditLog.create({ data: { vendorId: application.vendorId, userId: actor.userId, action: `SHOP_VERIFICATION_${target}`, entity: "ShopVerificationApplication", entityId: id, oldValues: { status: application.status }, newValues: { status: target, reason: text || undefined } } }); return updated;
    });
    revalidateTag(cacheTags.marketplace.shops, "max");
    revalidateTag(cacheTags.shop(application.vendorId), "max");
    revalidateTag(cacheTags.shopSlug(application.vendor.slug), "max");
    return updated;
  }

  static async addNote(id: string, body: string) { const actor = await requireAdminContext("platform:manage_verifications"); const text = clean(body); if (text.length < 2) throw new ShopVerificationError("Enter an internal note."); return prisma.$transaction(async tx => { const application = await tx.shopVerificationApplication.findUnique({ where: { id }, select: { vendorId: true } }); if (!application) throw new ShopVerificationError("Verification application not found.", "NOT_FOUND"); const note = await tx.shopVerificationNote.create({ data: { applicationId: id, adminId: actor.userId, body: text } }); await tx.shopVerificationActivity.create({ data: { applicationId: id, actorId: actor.userId, type: "INTERNAL_NOTE_ADDED" } }); await tx.auditLog.create({ data: { vendorId: application.vendorId, userId: actor.userId, action: "SHOP_VERIFICATION_NOTE_ADDED", entity: "ShopVerificationApplication", entityId: id } }); return note; }); }

  private static async eligibilityForVendor(vendorId: string) { const vendor = await prisma.vendorProfile.findUnique({ where: { id: vendorId }, include: { vendorApplication: true } }); if (!vendor) return ["SHOP_NOT_FOUND"]; return [vendor.status !== "ACTIVE" && "ACTIVE_SHOP", !vendor.storeName.trim() && "SHOP_NAME", (!vendor.email || !vendor.phone) && "BUSINESS_CONTACT", !vendor.description?.trim() && "SHOP_DESCRIPTION", !vendor.address?.trim() && "BUSINESS_ADDRESS", vendor.vendorApplication?.status !== "APPROVED" && "KYC_APPROVAL"].filter(Boolean) as string[]; }
}
