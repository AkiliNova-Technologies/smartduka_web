"use server";

import { prisma } from "@/lib/prisma/client";
import { getCurrentUserId } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { DocumentType } from "@prisma/client";

// ==========================================
// STORE PROFILE UPDATES
// ==========================================

export interface UpdateStoreProfileInput {
  storeName?: string;
  description?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  country?: string;
}

export async function updateStoreProfile(input: UpdateStoreProfileInput) {
  const userId = await getCurrentUserId();

  const profile = await prisma.vendorProfile.findUnique({
    where: { ownerId: userId },
  });

  if (!profile) {
    return { success: false, error: "Vendor profile not found." };
  }

  const updated = await prisma.vendorProfile.update({
    where: { id: profile.id },
    data: {
      ...(input.storeName !== undefined && { storeName: input.storeName }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.website !== undefined && { website: input.website }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.city !== undefined && { city: input.city }),
      ...(input.country !== undefined && { country: input.country }),
    },
  });

  revalidatePath("/vendor/settings");
  revalidatePath(`/brands/${profile.slug}`);
  revalidatePath("/brands");

  return { success: true, data: updated };
}

// ==========================================
// LOGO & BANNER UPLOAD
// ==========================================

export async function updateStoreLogo(logoUrl: string) {
  const userId = await getCurrentUserId();

  const profile = await prisma.vendorProfile.findUnique({
    where: { ownerId: userId },
  });

  if (!profile) {
    return { success: false, error: "Vendor profile not found." };
  }

  const updated = await prisma.vendorProfile.update({
    where: { id: profile.id },
    data: { logoUrl },
  });

  revalidatePath("/vendor/settings");
  revalidatePath(`/brands/${profile.slug}`);
  revalidatePath("/brands");

  return { success: true, data: updated };
}

export async function updateStoreBanner(bannerUrl: string) {
  const userId = await getCurrentUserId();

  const profile = await prisma.vendorProfile.findUnique({
    where: { ownerId: userId },
  });

  if (!profile) {
    return { success: false, error: "Vendor profile not found." };
  }

  const updated = await prisma.vendorProfile.update({
    where: { id: profile.id },
    data: { bannerUrl },
  });

  revalidatePath("/vendor/settings");
  revalidatePath(`/brands/${profile.slug}`);

  return { success: true, data: updated };
}

// ==========================================
// VERIFICATION DOCUMENTS
// ==========================================

export async function uploadVerificationDocument(
  documentType: DocumentType,
  name: string,
  url: string,
  mimeType?: string,
  size?: number
) {
  const userId = await getCurrentUserId();

  const profile = await prisma.vendorProfile.findUnique({
    where: { ownerId: userId },
  });

  if (!profile) {
    return { success: false, error: "Vendor profile not found." };
  }

  const document = await prisma.document.create({
    data: {
      vendorId: profile.id,
      type: documentType,
      name,
      url,
      mimeType: mimeType || null,
      size: size || null,
    },
  });

  revalidatePath("/vendor/settings");

  return { success: true, data: document };
}

export async function deleteVendorDocument(documentId: string) {
  const userId = await getCurrentUserId();

  const profile = await prisma.vendorProfile.findUnique({
    where: { ownerId: userId },
  });

  if (!profile) {
    return { success: false, error: "Vendor profile not found." };
  }

  // Verify the document belongs to this vendor
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      vendorId: profile.id,
    },
  });

  if (!document) {
    return { success: false, error: "Document not found." };
  }

  await prisma.document.delete({
    where: { id: documentId },
  });

  revalidatePath("/vendor/settings");

  return { success: true };
}

export async function getMyVendorDocuments() {
  const userId = await getCurrentUserId();

  const profile = await prisma.vendorProfile.findUnique({
    where: { ownerId: userId },
  });

  if (!profile) {
    return { success: false, error: "Vendor profile not found.", data: [] };
  }

  const documents = await prisma.document.findMany({
    where: { vendorId: profile.id },
    orderBy: { createdAt: "desc" },
  });

  return { success: true, data: documents };
}

// ==========================================
// FULL PROFILE (for settings page)
// ==========================================

export async function getMyFullVendorProfile() {
  const userId = await getCurrentUserId();

  const profile = await prisma.vendorProfile.findUnique({
    where: { ownerId: userId },
    include: {
      documents: {
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: {
          products: true,
          subOrders: true,
        },
      },
    },
  });

  if (!profile) {
    return { success: false, error: "Vendor profile not found.", data: null };
  }

  return { success: true, data: profile };
}