import { VendorUserRole } from "@prisma/client";
import { requireVendorContext } from "@/lib/auth/vendor-context";
import { prisma } from "@/lib/prisma/client";
import { VendorEntitlementService } from "@/services/vendor-entitlement";

export class VendorTeamError extends Error { constructor(message: string, public code = "VENDOR_TEAM_ERROR") { super(message); } }

const delegableRoles = new Set<VendorUserRole>(["ADMIN", "MANAGER", "STAFF", "ACCOUNTANT"]);

async function requireOwner() {
  const context = await requireVendorContext("vendor:manage_team");
  if (context.vendor.ownerId !== context.user.id || context.vendorRole !== "OWNER") {
    throw new VendorTeamError("Only the shop owner can manage the team.");
  }
  return context;
}

export class VendorTeamService {
  static async list() {
    const context = await requireVendorContext("vendor:manage_team");
    return prisma.user.findMany({
      where: { OR: [{ vendorId: context.vendorId }, { id: context.vendor.ownerId }] },
      select: { id: true, name: true, email: true, phone: true, status: true, vendorRole: true, createdAt: true },
      orderBy: [{ vendorRole: "asc" }, { name: "asc" }],
    });
  }

  static async add(email: string, role: VendorUserRole) {
    const context = await requireOwner();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !delegableRoles.has(role)) throw new VendorTeamError("Choose an existing user and a delegable role.");
    const member = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true, vendorId: true, vendorRole: true, status: true } });
    if (!member || member.status !== "ACTIVE") throw new VendorTeamError("Choose an active Mwezora user.");
    if (member.id === context.user.id) throw new VendorTeamError("The owner already has full shop access.");
    if (member.vendorId && member.vendorId !== context.vendorId) throw new VendorTeamError("This user already belongs to another shop.");
    const entitlement = await VendorEntitlementService.summary(context.vendorId);
    const limit = VendorEntitlementService.staffSeatLimit(entitlement);
    return prisma.$transaction(async tx => {
      const used = await tx.user.count({ where: { vendorId: context.vendorId, id: { not: context.vendor.ownerId }, vendorRole: { in: [...delegableRoles] } } });
      if (used >= limit) throw new VendorTeamError(limit === 0 ? "A subscription is required before adding team members." : "You've reached the staff limit for your current Mwezora plan.", "STAFF_LIMIT_REACHED");
      const updated = await tx.user.update({ where: { id: member.id }, data: { vendorId: context.vendorId, vendorRole: role } });
      await tx.auditLog.create({ data: { vendorId: context.vendorId, userId: context.user.id, action: member.vendorId ? "VENDOR_TEAM_ROLE_CHANGED" : "VENDOR_TEAM_MEMBER_ADDED", entity: "User", entityId: member.id, oldValues: { vendorRole: member.vendorRole }, newValues: { vendorRole: role } } });
      return updated;
    }, { isolationLevel: "Serializable" });
  }

  static async seatUsage() { const context = await requireVendorContext("vendor:manage_team"); const entitlement = await VendorEntitlementService.summary(context.vendorId); const used = await prisma.user.count({ where: { vendorId: context.vendorId, id: { not: context.vendor.ownerId }, vendorRole: { in: [...delegableRoles] } } }); const limit = VendorEntitlementService.staffSeatLimit(entitlement); return { used, limit, canAdd: used < limit, state: entitlement.status }; }

  static async changeRole(memberId: string, role: VendorUserRole) {
    const context = await requireOwner();
    if (!delegableRoles.has(role)) throw new VendorTeamError("Owner access cannot be delegated.");
    const member = await prisma.user.findFirst({ where: { id: memberId, vendorId: context.vendorId }, select: { id: true, vendorRole: true } });
    if (!member) throw new VendorTeamError("Team member not found.");
    return prisma.$transaction(async tx => {
      const updated = await tx.user.update({ where: { id: member.id }, data: { vendorRole: role } });
      await tx.auditLog.create({ data: { vendorId: context.vendorId, userId: context.user.id, action: "VENDOR_TEAM_ROLE_CHANGED", entity: "User", entityId: member.id, oldValues: { vendorRole: member.vendorRole }, newValues: { vendorRole: role } } });
      return updated;
    });
  }

  static async remove(memberId: string) {
    const context = await requireOwner();
    const member = await prisma.user.findFirst({ where: { id: memberId, vendorId: context.vendorId }, select: { id: true, vendorRole: true } });
    if (!member) throw new VendorTeamError("Team member not found.");
    return prisma.$transaction(async tx => {
      const updated = await tx.user.update({ where: { id: member.id }, data: { vendorId: null, vendorRole: null } });
      await tx.auditLog.create({ data: { vendorId: context.vendorId, userId: context.user.id, action: "VENDOR_TEAM_MEMBER_REMOVED", entity: "User", entityId: member.id, oldValues: { vendorRole: member.vendorRole } } });
      return updated;
    });
  }
}
