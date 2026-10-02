"use server";

import { VendorService } from "@/services/vendor";
import { requireActiveUserId } from "@/lib/auth/session";
import { requireApplicantContext } from "@/lib/auth/applicant-context";
import { VerificationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { withErrorHandling } from "@/lib/api-utils";
import { requireAdminContext } from "@/lib/auth/admin-context";
import { toVendorProfileDto } from "@/lib/vendor-profile-dto";

export async function getMyVendorApplication() {
  return withErrorHandling(async () => VendorService.getMyApplication((await requireApplicantContext()).userId), "getMyVendorApplication");
}

export async function getAllVendorApplications(filters?: { status?: VerificationStatus; search?: string }) {
  return withErrorHandling(async () => {
    await requireAdminContext("platform:manage_vendors");
    return VendorService.getAllApplications(filters);
  }, "getAllVendorApplications");
}

export async function approveVendorApplication(applicationId: string, notes?: string) {
  return withErrorHandling(async () => {
    const admin = await requireAdminContext("platform:manage_vendors");
    const result = await VendorService.updateApplicationStatus(applicationId, "APPROVED", notes, admin.userId);
    revalidatePath("/admin/vendors");
    revalidatePath("/vendor");
    return result;
  }, "approveVendorApplication");
}

export async function rejectVendorApplication(applicationId: string, notes: string) {
  return withErrorHandling(async () => {
    const admin = await requireAdminContext("platform:manage_vendors");
    const result = await VendorService.updateApplicationStatus(applicationId, "REJECTED", notes, admin.userId);
    revalidatePath("/admin/vendors");
    return result;
  }, "rejectVendorApplication");
}

export async function getMyVendorProfile() {
  return withErrorHandling(async () => {
    const profile = await VendorService.getVendorProfileByOwner(await requireActiveUserId());
    return profile ? toVendorProfileDto(profile) : null;
  }, "getMyVendorProfile");
}

export async function getPublicStoreListings() {
  return withErrorHandling(() => VendorService.getPublicStoreListings(), "getPublicStoreListings");
}
