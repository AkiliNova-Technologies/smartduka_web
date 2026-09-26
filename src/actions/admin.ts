"use server";

import { AdminService } from "@/services/admin";
import { PlatformRole, UserStatus, VerificationStatus } from "@prisma/client";
import { withErrorHandling } from "@/lib/api-utils";
import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/lib/auth/admin-context";

export async function getPlatformMetricsAction() {
  return withErrorHandling(async () => {
    await requireAdminContext("platform:view_analytics");
    return AdminService.getPlatformMetrics();
  }, "getPlatformMetricsAction");
}

export async function getAllUsersAction(options?: { search?: string; role?: PlatformRole; status?: string; limit?: number; offset?: number }) {
  return withErrorHandling(async () => {
    await requireAdminContext("platform:customer_support");
    return AdminService.getAllUsers(options);
  }, "getAllUsersAction");
}

export async function getUserByIdAction(userId: string) {
  return withErrorHandling(async () => {
    await requireAdminContext("platform:customer_support");
    return AdminService.getUserById(userId);
  }, "getUserByIdAction");
}

export async function updateUserRoleAction(userId: string, platformRole: PlatformRole) {
  return withErrorHandling(async () => {
    const admin = await requireAdminContext("platform:manage");
    const user = await AdminService.updateUserRole(userId, platformRole, admin.userId);
    revalidatePath("/admin/users");
    return user;
  }, "updateUserRoleAction");
}

export async function updateUserStatusAction(userId: string, status: UserStatus) {
  return withErrorHandling(async () => {
    const admin = await requireAdminContext("platform:manage");
    const user = await AdminService.updateUserStatus(userId, status, admin.userId);
    revalidatePath("/admin/users");
    return user;
  }, "updateUserStatusAction");
}

export async function getAllVendorApplicationsAction(filters?: { status?: VerificationStatus; search?: string }) {
  return withErrorHandling(async () => {
    await requireAdminContext("platform:manage_vendors");
    return AdminService.getAllVendorApplications(filters);
  }, "getAllVendorApplicationsAction");
}

export async function getVendorApplicationByIdAction(applicationId: string) {
  return withErrorHandling(async () => {
    await requireAdminContext("platform:manage_vendors");
    return AdminService.getVendorApplicationById(applicationId);
  }, "getVendorApplicationByIdAction");
}

export async function verifyVendorAction(applicationId: string, status: VerificationStatus, reviewerNotes?: string) {
  return withErrorHandling(async () => {
    const admin = await requireAdminContext("platform:manage_vendors");
    const result = await AdminService.verifyVendor(applicationId, status, reviewerNotes || null, admin.userId);
    revalidatePath("/admin/vendors");
    return result;
  }, "verifyVendorAction");
}

export async function getAllOrdersAction() {
  return withErrorHandling(async () => {
    await requireAdminContext("platform:customer_support");
    return AdminService.getAllOrders();
  }, "getAllOrdersAction");
}
