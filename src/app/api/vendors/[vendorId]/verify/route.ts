import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { DocumentType } from "@prisma/client";
import { AuthenticationRequiredError } from "@/lib/auth/session";
import { ApplicantAuthorizationError, requireApplicantContext } from "@/lib/auth/applicant-context";
import { successResponse, errorResponse, getErrorMessage } from "@/lib/api-utils";

interface DocumentPayload { name: string; url: string; mimeType?: string; size?: number; }

function applicantError(error: unknown) {
  return errorResponse(getErrorMessage(error), error instanceof AuthenticationRequiredError ? 401 : error instanceof ApplicantAuthorizationError ? 403 : 500);
}

/** Applicant KYC submission: the route parameter is a target vendor resource, never authority. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ vendorId: string }> }) {
  try {
    const applicant = await requireApplicantContext();
    const { vendorId } = await params;
    const body: unknown = await req.json();
    if (!body || typeof body !== "object") return errorResponse("Invalid documents payload.", 400);
    const documents = (body as { documents?: unknown }).documents;
    if (!documents || typeof documents !== "object" || Array.isArray(documents)) return errorResponse("Documents are required.", 400);

    const vendor = await prisma.vendorProfile.findFirst({
      where: { id: vendorId, ownerId: applicant.userId },
      include: { vendorApplication: true },
    });
    if (!vendor) return errorResponse("Vendor not found.", 404);
    if (!vendor.vendorApplication) return errorResponse("No linked application found.", 400);

    const entries = Object.entries(documents as Record<string, DocumentPayload>);
    if (!entries.length) return errorResponse("At least one document is required.", 400);
    for (const [type, document] of entries) {
      if (!Object.values(DocumentType).includes(type as DocumentType) || !document || typeof document.name !== "string" || !document.name.trim() || typeof document.url !== "string" || !document.url.trim()) return errorResponse("Invalid document payload.", 400);
      if (document.size !== undefined && (!Number.isInteger(document.size) || document.size < 0)) return errorResponse("Invalid document size.", 400);
    }

    const documentRecords = await prisma.$transaction(async (tx) => {
      const created = await Promise.all(entries.map(([type, document]) => tx.vendorDocument.create({
        data: { applicationId: vendor.vendorApplication!.id, type: type as DocumentType, name: document.name.trim(), url: document.url.trim(), mimeType: document.mimeType || null, size: document.size || null, status: "SUBMITTED" },
      })));
      await tx.vendorApplication.update({ where: { id: vendor.vendorApplication!.id }, data: { status: "UNDER_REVIEW" } });
      return created;
    });
    return successResponse({ documents: documentRecords });
  } catch (error: unknown) {
    console.error("[Verification Upload API]", error);
    return applicantError(error);
  }
}
