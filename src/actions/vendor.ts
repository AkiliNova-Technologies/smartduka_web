"use server";

import { VendorService } from "@/services/vendor";
import { getCurrentUserId } from "@/lib/auth/session";
import { VerificationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { withErrorHandling } from "@/lib/api-utils";

// ==========================================
// VENDOR ACTIONS
// ==========================================

/**
 * Get the current user's vendor application
 */
export async function getMyVendorApplication() {
  return withErrorHandling(async () => {
    const userId = await getCurrentUserId();
    return VendorService.getMyApplication(userId);
  }, "getMyVendorApplication");
}

/**
 * Get all vendor applications (admin only)
 */
export async function getAllVendorApplications(filters?: {
  status?: VerificationStatus;
  search?: string;
}) {
  return withErrorHandling(
    () => VendorService.getAllApplications(filters),
    "getAllVendorApplications"
  );
}

/**
 * Approve a vendor application
 */
export async function approveVendorApplication(
  applicationId: string,
  notes?: string
) {
  return withErrorHandling(async () => {
    const userId = await getCurrentUserId();
    const result = await VendorService.updateApplicationStatus(
      applicationId,
      "APPROVED",
      notes,
      userId
    );
    revalidatePath("/admin/vendors");
    revalidatePath("/vendor");
    return result;
  }, "approveVendorApplication");
}

/**
 * Reject a vendor application
 */
export async function rejectVendorApplication(
  applicationId: string,
  notes: string
) {
  return withErrorHandling(async () => {
    const userId = await getCurrentUserId();
    const result = await VendorService.updateApplicationStatus(
      applicationId,
      "REJECTED",
      notes,
      userId
    );
    revalidatePath("/admin/vendors");
    return result;
  }, "rejectVendorApplication");
}

/**
 * Get vendor profile by owner
 */
export async function getMyVendorProfile() {
  return withErrorHandling(async () => {
    const userId = await getCurrentUserId();
    return VendorService.getVendorProfileByOwner(userId);
  }, "getMyVendorProfile");
}

/**
 * Get all active vendor stores for the public brands listing page
 */
export async function getPublicStoreListings() {
  return withErrorHandling(
    () => VendorService.getPublicStoreListings(),
    "getPublicStoreListings"
  );
}