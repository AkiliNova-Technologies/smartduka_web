"use server";

import { prisma } from "@/lib/prisma/client";
import { requireVendorContext } from "@/lib/auth/vendor-context";
import { revalidatePath } from "next/cache";
import { DocumentType } from "@prisma/client";

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
  const context = await requireVendorContext("vendor:manage_shop");
  const updated = await prisma.vendorProfile.update({
    where: { id: context.vendorId },
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
  revalidatePath(`/brands/${context.vendor.slug}`);
  revalidatePath("/brands");
  return { success: true, data: updated, error: undefined };
}

export async function updateStoreLogo(logoUrl: string) {
  const context = await requireVendorContext("vendor:manage_shop");
  const updated = await prisma.vendorProfile.update({
    where: { id: context.vendorId },
    data: { logoUrl },
  });

  revalidatePath("/vendor/settings");
  revalidatePath(`/brands/${context.vendor.slug}`);
  revalidatePath("/brands");
  return { success: true, data: updated, error: undefined };
}

export async function updateStoreBanner(bannerUrl: string) {
  const context = await requireVendorContext("vendor:manage_shop");
  const updated = await prisma.vendorProfile.update({
    where: { id: context.vendorId },
    data: { bannerUrl },
  });

  revalidatePath("/vendor/settings");
  revalidatePath(`/brands/${context.vendor.slug}`);
  return { success: true, data: updated, error: undefined };
}

export async function uploadVerificationDocument(
  documentType: DocumentType,
  name: string,
  url: string,
  mimeType?: string,
  size?: number,
) {
  const context = await requireVendorContext("vendor:manage_shop");
  const document = await prisma.document.create({
    data: {
      vendorId: context.vendorId,
      type: documentType,
      name,
      url,
      mimeType: mimeType || null,
      size: size || null,
    },
  });

  revalidatePath("/vendor/settings");
  return { success: true, data: document, error: undefined };
}

export async function deleteVendorDocument(documentId: string) {
  const context = await requireVendorContext("vendor:manage_shop");
  const document = await prisma.document.findFirst({
    where: { id: documentId, vendorId: context.vendorId },
  });
  if (!document) return { success: false, error: "Document not found." };

  await prisma.document.delete({ where: { id: documentId } });
  revalidatePath("/vendor/settings");
  return { success: true };
}

export async function getMyVendorDocuments() {
  const context = await requireVendorContext("vendor:manage_shop");
  const documents = await prisma.document.findMany({
    where: { vendorId: context.vendorId },
    orderBy: { createdAt: "desc" },
  });
  return { success: true, data: documents };
}

export async function getMyFullVendorProfile() {
  const context = await requireVendorContext();
  const profile = await prisma.vendorProfile.findUnique({
    where: { id: context.vendorId },
    include: {
      documents: { orderBy: { createdAt: "desc" } },
      _count: { select: { products: true, subOrders: true } },
    },
  });

  if (!profile) return { success: false, error: "Vendor profile not found.", data: null };
  return { success: true, data: profile };
}
