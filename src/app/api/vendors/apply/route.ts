import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { AuthenticationRequiredError } from "@/lib/auth/session";
import { ApplicantAuthorizationError, requireApplicantContext } from "@/lib/auth/applicant-context";
import { VendorService } from "@/services/vendor";
import { successResponse, errorResponse, getErrorMessage } from "@/lib/api-utils";

function applicantError(error: unknown) {
  return errorResponse(getErrorMessage(error), error instanceof AuthenticationRequiredError ? 401 : error instanceof ApplicantAuthorizationError ? 403 : 500);
}

export async function GET() {
  try {
    const applicant = await requireApplicantContext();
    const application = await VendorService.getMyApplication(applicant.userId);
    const profile = await VendorService.getVendorProfileByOwner(applicant.userId);
    if (!application && !profile) return errorResponse("No vendor application or profile found.", 404, "NOT_FOUND");
    return successResponse({ application, profile });
  } catch (error: unknown) {
    console.error("[Vendor Apply API GET]", error);
    return applicantError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const applicant = await requireApplicantContext();
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return errorResponse("Invalid application payload.", 400, "VALIDATION_ERROR");
    const input = body as Record<string, unknown>;
    const storeName = typeof input.storeName === "string" ? input.storeName.trim() : "";
    const storeSlug = typeof input.storeSlug === "string" ? input.storeSlug.trim() : "";
    const businessEmail = typeof input.businessEmail === "string" ? input.businessEmail.trim() : "";
    const businessPhone = typeof input.businessPhone === "string" ? input.businessPhone.trim() : "";
    if (!storeName || !storeSlug || !businessEmail || !businessPhone) return errorResponse("Missing required core application fields: storeName, storeSlug, businessEmail, businessPhone.", 400, "VALIDATION_ERROR");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(storeSlug)) return errorResponse("Store slug must contain only lowercase letters, numbers, and hyphens.", 400, "INVALID_SLUG");

    const [existingSlug, existingApp, existingProfile] = await Promise.all([
      prisma.vendorApplication.findUnique({ where: { storeSlug } }),
      prisma.vendorApplication.findUnique({ where: { userId: applicant.userId } }),
      prisma.vendorProfile.findUnique({ where: { ownerId: applicant.userId } }),
    ]);
    if (existingSlug) return errorResponse("This store name/slug is already taken by another merchant.", 409, "SLUG_TAKEN");
    if (existingApp || existingProfile) return errorResponse("You already have a vendor application or store profile.", 400, "DUPLICATE_APPLICATION");

    const text = (key: string) => typeof input[key] === "string" ? input[key] : null;
    const momoNetwork = text("momoNetwork");
    const momoNumber = text("momoNumber");
    if (momoNetwork && momoNumber && !/^(07|\+2567|2567)\d{8}$/.test(momoNumber.replace(/\s/g, ""))) return errorResponse("Please provide a valid Ugandan mobile money number (e.g., 077XXXXXXX).", 400, "INVALID_MOMO");

    const application = await prisma.vendorApplication.create({
      data: {
        userId: applicant.userId, storeName, storeSlug, businessType: text("businessType") || "Sole Proprietorship",
        registrationNumber: text("registrationNumber"), taxId: text("taxId"), businessEmail, businessPhone,
        website: text("website"), streetAddress: text("streetAddress") || "", city: text("city") || "Kampala",
        district: text("district"), country: "Uganda", hasPhysicalStore: input.hasPhysicalStore === true,
        storeLocation: text("storeLocation"), momoNetwork, momoNumber, bankName: text("bankName"),
        bankAccountName: text("bankAccountName"), bankAccountNumber: text("bankAccountNumber"),
      },
    });
    return successResponse({ id: application.id, storeName: application.storeName, status: application.status, createdAt: application.createdAt }, 201);
  } catch (error: unknown) {
    console.error("[Vendor Apply API POST]", error);
    if (typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2002") return errorResponse("A duplicate record was detected.", 409, "DUPLICATE_RECORD");
    return applicantError(error);
  }
}
