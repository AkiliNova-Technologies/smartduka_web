"use server";

import { prisma } from "@/lib/prisma/client";
import { requireVendorContext } from "@/lib/auth/vendor-context";
import { revalidatePath, updateTag } from "next/cache";
import { cacheTags } from "@/lib/cache-policy";
import { DocumentType } from "@prisma/client";
import { z } from "zod";
import {
  FulfillmentMethodSchema,
  type FulfillmentMethod,
} from "@/lib/fulfillment";
import { toVendorProfileDto } from "@/lib/vendor-profile-dto";

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

  updateTag(cacheTags.marketplace.shops);
  updateTag(cacheTags.shop(context.vendorId));

  revalidatePath("/vendor/settings");
  revalidatePath(`/shops/${context.vendor.slug}`);
  revalidatePath("/shops");
  return { success: true, data: updated, error: undefined };
}

const fulfillmentSettingsSchema = z.object({
  methods: z.array(FulfillmentMethodSchema).min(1, "Choose at least one fulfilment method."),
  deliveryFee: z.coerce.number().finite("Enter a valid delivery fee.").nonnegative("Enter a valid delivery fee.").optional(),
  deliveryEstimate: z.string().optional(),
  pickupLocation: z.string().optional(),
  pickupDirections: z.string().optional(),
  pickupInstructions: z.string().optional(),
});

const returnPolicySchema = z.object({
  returnWindowDays: z.coerce.number().int().min(7).max(90),
  returnPolicy: z.string().optional(),
  returnInstructions: z.string().optional(),
  returnAddress: z.string().optional(),
  acceptsExchanges: z.boolean().optional(),
  exchangePolicy: z.string().optional(),
}).superRefine((value, context) => {
  if (value.acceptsExchanges && !value.exchangePolicy?.trim()) {
    context.addIssue({ code: "custom", path: ["exchangePolicy"], message: "Add an exchange policy or disable exchanges." });
  }
});

type SettingsFieldErrors = Partial<Record<"methods" | "deliveryFee" | "pickupLocation" | "returnWindowDays" | "exchangePolicy", string>>;

function fieldErrors(error: z.ZodError): SettingsFieldErrors {
  const errors: SettingsFieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (field === "methods" || field === "deliveryFee" || field === "pickupLocation" || field === "returnWindowDays" || field === "exchangePolicy") errors[field] ??= issue.message;
  }
  return errors;
}

export async function updateFulfillmentSettings(input: unknown) {
  const context = await requireVendorContext("vendor:manage_shop");
  const parsed = fulfillmentSettingsSchema.safeParse(input);
  if (!parsed.success) return { success: false, fieldErrors: fieldErrors(parsed.error) };
  const methods = [...new Set(parsed.data.methods)] as FulfillmentMethod[];
  const errors: SettingsFieldErrors = {};
  const deliveryFee = parsed.data.deliveryFee ?? 0;
  if (methods.includes("DELIVERY") && (!Number.isFinite(deliveryFee) || deliveryFee < 0)) errors.deliveryFee = "Enter a valid delivery fee.";
  if (methods.includes("PICKUP") && !parsed.data.pickupLocation?.trim()) errors.pickupLocation = "Enter a pickup location.";
  if (Object.keys(errors).length) return { success: false, fieldErrors: errors };
  await prisma.vendorProfile.update({
    where: { id: context.vendorId },
    data: {
      fulfillmentMethods: methods,
      deliveryFee: methods.includes("DELIVERY") ? deliveryFee : 0,
      deliveryEstimate: parsed.data.deliveryEstimate?.trim() || null,
      pickupLocation: parsed.data.pickupLocation?.trim() || null,
      pickupDirections: parsed.data.pickupDirections?.trim() || null,
      pickupInstructions: parsed.data.pickupInstructions?.trim() || null,
    },
  });
  updateTag(cacheTags.marketplace.shops);
  updateTag(cacheTags.shop(context.vendorId));
  await prisma.auditLog.create({ data: { vendorId: context.vendorId, userId: context.user.id, action: "FULFILLMENT_SETTINGS_UPDATED", entity: "VendorProfile", entityId: context.vendorId, newValues: { methods } } });
  revalidatePath("/vendor/settings");
  revalidatePath(`/shops/${context.vendor.slug}`);
  return { success: true, error: undefined };
}

export async function updateReturnPolicy(input: unknown) {
  const context = await requireVendorContext("vendor:manage_shop");
  const parsed = returnPolicySchema.safeParse(input);
  if (!parsed.success) return { success: false, fieldErrors: fieldErrors(parsed.error) };
  const { data } = parsed;
  await prisma.vendorProfile.update({
    where: { id: context.vendorId },
    data: {
      returnWindowDays: data.returnWindowDays,
      returnPolicy: data.returnPolicy?.trim() || null,
      returnInstructions: data.returnInstructions?.trim() || null,
      returnAddress: data.returnAddress?.trim() || null,
      acceptsExchanges: Boolean(data.acceptsExchanges),
      exchangePolicy: data.exchangePolicy?.trim() || null,
    },
  });
  updateTag(cacheTags.marketplace.shops);
  updateTag(cacheTags.shop(context.vendorId));
  await prisma.auditLog.create({ data: { vendorId: context.vendorId, userId: context.user.id, action: "RETURN_POLICY_UPDATED", entity: "VendorProfile", entityId: context.vendorId, newValues: { returnWindowDays: data.returnWindowDays, acceptsExchanges: Boolean(data.acceptsExchanges) } } });
  revalidatePath("/vendor/settings");
  revalidatePath(`/shops/${context.vendor.slug}`);
  return { success: true, error: undefined };
}

export async function updateStoreLogo(logoUrl: string) {
  const context = await requireVendorContext("vendor:manage_shop");
  const updated = await prisma.vendorProfile.update({
    where: { id: context.vendorId },
    data: { logoUrl },
  });

  updateTag(cacheTags.marketplace.shops);
  updateTag(cacheTags.shop(context.vendorId));

  revalidatePath("/vendor/settings");
  revalidatePath(`/shops/${context.vendor.slug}`);
  revalidatePath("/shops");
  return { success: true, data: updated, error: undefined };
}

export async function updateStoreBanner(bannerUrl: string) {
  const context = await requireVendorContext("vendor:manage_shop");
  const updated = await prisma.vendorProfile.update({
    where: { id: context.vendorId },
    data: { bannerUrl },
  });

  updateTag(cacheTags.marketplace.shops);
  updateTag(cacheTags.shop(context.vendorId));

  revalidatePath("/vendor/settings");
  revalidatePath(`/shops/${context.vendor.slug}`);
  return { success: true, data: updated, error: undefined };
}

export async function uploadVerificationDocument(
  documentType: DocumentType,
  name: string,
  url: string,
  mimeType?: string,
  size?: number,
) {
  const context = await requireVendorContext("vendor:manage_legal");
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
  const context = await requireVendorContext("vendor:manage_legal");
  const document = await prisma.document.findFirst({
    where: { id: documentId, vendorId: context.vendorId },
  });
  if (!document) return { success: false, error: "Document not found." };

  await prisma.document.delete({ where: { id: documentId } });
  revalidatePath("/vendor/settings");
  return { success: true };
}

export async function getMyVendorDocuments() {
  const context = await requireVendorContext("vendor:manage_legal");
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
  return { success: true, data: toVendorProfileDto({ ...profile, documents: context.vendor.ownerId === context.user.id ? profile.documents : [] }) };
}
