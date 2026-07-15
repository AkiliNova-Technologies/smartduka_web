import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { VerificationStatus } from "@prisma/client";
import { VendorService } from "@/services/vendor";
import {
  successResponse,
  errorResponse,
  getErrorMessage,
} from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId =
      url.searchParams.get("userId") ||
      request.headers.get("x-marketplace-user-id");

    if (!userId) {
      return errorResponse("User ID is required.", 400, "MISSING_USER_ID");
    }

    const application = await VendorService.getMyApplication(userId);
    const profile = await VendorService.getVendorProfileByOwner(userId);

    if (!application && !profile) {
      return errorResponse(
        "No vendor application or profile found.",
        404,
        "NOT_FOUND"
      );
    }

    return successResponse({ application, profile });
  } catch (error: unknown) {
    console.error("[Vendor Apply API GET]", error);
    return errorResponse(getErrorMessage(error));
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      userId,
      storeName,
      storeSlug,
      businessType,
      registrationNumber,
      taxId,
      businessEmail,
      businessPhone,
      website,
      streetAddress,
      city,
      district,
      hasPhysicalStore,
      storeLocation,
      momoNetwork,
      momoNumber,
      bankName,
      bankAccountName,
      bankAccountNumber,
    } = body;

    // Required core fields
    if (!userId || !storeName || !storeSlug || !businessEmail || !businessPhone) {
      return errorResponse(
        "Missing required core application fields: userId, storeName, storeSlug, businessEmail, businessPhone.",
        400,
        "VALIDATION_ERROR"
      );
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(storeSlug)) {
      return errorResponse(
        "Store slug must contain only lowercase letters, numbers, and hyphens.",
        400,
        "INVALID_SLUG"
      );
    }

    // Duplication guard: slug uniqueness
    const existingSlug = await prisma.vendorApplication.findUnique({
      where: { storeSlug },
    });

    if (existingSlug) {
      return errorResponse(
        "This store name/slug is already taken by another merchant.",
        409,
        "SLUG_TAKEN"
      );
    }

    // Duplication guard: one application per user
    const existingApp = await prisma.vendorApplication.findUnique({
      where: { userId },
    });

    if (existingApp) {
      return errorResponse(
        "You have already submitted a vendor application. Please wait for review.",
        400,
        "DUPLICATE_APPLICATION"
      );
    }

    // Validate momoNumber format only if network is selected
    if (momoNetwork && momoNumber) {
      const momoRegex = /^(07|\+2567|2567)\d{8}$/;
      if (!momoRegex.test(momoNumber.replace(/\s/g, ""))) {
        return errorResponse(
          "Please provide a valid Ugandan mobile money number (e.g., 077XXXXXXX).",
          400,
          "INVALID_MOMO"
        );
      }
    }

    const application = await prisma.vendorApplication.create({
      data: {
        userId,
        storeName,
        storeSlug,
        businessType: businessType || "Sole Proprietorship",
        registrationNumber: registrationNumber || null,
        taxId: taxId || null,
        businessEmail,
        businessPhone,
        website: website || null,
        streetAddress: streetAddress || null,
        city: city || "Kampala",
        district: district || null,
        country: "Uganda",
        hasPhysicalStore: Boolean(hasPhysicalStore),
        storeLocation: storeLocation || null,
        momoNetwork: momoNetwork || null,
        momoNumber: momoNumber || null,
        bankName: bankName || null,
        bankAccountName: bankAccountName || null,
        bankAccountNumber: bankAccountNumber || null,
        status: VerificationStatus.PENDING,
      },
    });

    return successResponse(
      {
        id: application.id,
        storeName: application.storeName,
        status: application.status,
        createdAt: application.createdAt,
      },
      201
    );
  } catch (error: unknown) {
    console.error("[Vendor Apply API POST]", error);

    // Handle Prisma unique constraint violations gracefully
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return errorResponse(
        "A duplicate record was detected. This store slug or user may already have an application.",
        409,
        "DUPLICATE_RECORD"
      );
    }

    return errorResponse(getErrorMessage(error));
  }
}