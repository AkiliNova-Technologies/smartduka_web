"use server";

import { vendorService } from "@/services/vendor";
import { getCurrentUserId } from "@/lib/auth/session";
import { VerificationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

/**
 * Get the current user's vendor application
 */
export async function getMyVendorApplication() {
  const userId = await getCurrentUserId();
  return vendorService.getMyApplication(userId);
}

/**
 * Get all vendor applications (admin only)
 */
export async function getAllVendorApplications(filters?: {
  status?: VerificationStatus;
  search?: string;
}) {
  return vendorService.getAllApplications(filters);
}

/**
 * Approve a vendor application
 */
export async function approveVendorApplication(
  applicationId: string,
  notes?: string
) {
  const userId = await getCurrentUserId();
  const result = await vendorService.updateApplicationStatus(
    applicationId,
    "APPROVED",
    notes,
    userId
  );
  revalidatePath("/admin/vendors");
  revalidatePath("/vendor");
  return result;
}

/**
 * Reject a vendor application
 */
export async function rejectVendorApplication(
  applicationId: string,
  notes: string
) {
  const userId = await getCurrentUserId();
  const result = await vendorService.updateApplicationStatus(
    applicationId,
    "REJECTED",
    notes,
    userId
  );
  revalidatePath("/admin/vendors");
  return result;
}

/**
 * Get vendor profile by owner
 */
export async function getMyVendorProfile() {
  const userId = await getCurrentUserId();
  return vendorService.getVendorProfileByOwner(userId);
}

/**
 * Get all active vendor stores for the public brands listing page
 */
export async function getPublicStoreListings() {
  return vendorService.getPublicStoreListings();
}