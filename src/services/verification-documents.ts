import { requireAdminContext } from "@/lib/auth/admin-context";
import { requireVendorContext } from "@/lib/auth/vendor-context";
import { parsePrivateDocumentReference } from "@/lib/private-document-storage";
import { prisma } from "@/lib/prisma/client";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  adminVisibleOnboardingDocumentsWhere,
  adminVisibleProfileDocumentsWhere,
  aggregateVendorDocuments,
} from "@/lib/vendor-document-aggregation";

export type VerificationDocumentSource = "profile" | "onboarding";

const sourceSelect = { id: true, type: true, name: true, url: true, mimeType: true, size: true, createdAt: true } as const;

export class VerificationDocumentError extends Error {
  constructor(message: string, public code: "NOT_FOUND" | "INVALID_REFERENCE" | "STORAGE_ERROR" = "NOT_FOUND") { super(message); }
}

function metadata(source: VerificationDocumentSource, document: { id: string; type: string; name: string; mimeType: string | null; size: number | null; createdAt: Date }, status: string, applicationId?: string) {
  return {
    id: document.id,
    source,
    type: document.type,
    name: document.name,
    mimeType: document.mimeType,
    size: document.size,
    uploadedAt: document.createdAt,
    status,
    applicationId: applicationId ?? null,
    viewUrl: `/api/admin/documents/${source}/${document.id}`,
    downloadUrl: `/api/admin/documents/${source}/${document.id}?download=1`,
  };
}

export class VerificationDocumentService {
  static async getAdminVendorDetails(onboardingApplicationId: string) {
    await requireAdminContext("platform:manage_verifications");
    const onboarding = await prisma.vendorApplication.findUnique({
      where: { id: onboardingApplicationId },
      include: {
        documents: { where: adminVisibleOnboardingDocumentsWhere, orderBy: { createdAt: "desc" } },
        vendorProfile: {
          include: {
            documents: { where: adminVisibleProfileDocumentsWhere, orderBy: { createdAt: "desc" } },
            verificationApplications: {
              orderBy: { submittedAt: "desc" },
              include: {
                decisionBy: { select: { name: true } },
                documents: { select: { documentId: true, vendorDocumentId: true } },
              },
            },
          },
        },
      },
    });
    if (!onboarding) throw new VerificationDocumentError("Vendor application not found.");
    const profileDocuments = onboarding.vendorProfile?.documents ?? [];
    const documents = aggregateVendorDocuments({
      profile: profileDocuments,
      onboarding: onboarding.documents,
    }).map(({ source, document }) => source === "profile"
      ? metadata(source, document, "AVAILABLE")
      : metadata(source, document, document.status, onboarding.id)
    ).sort((left, right) => right.uploadedAt.getTime() - left.uploadedAt.getTime());
    return {
      vendorId: onboarding.vendorProfile?.id ?? null,
      verificationStatus: onboarding.vendorProfile?.verificationStatus ?? "NOT_APPLIED",
      verifiedAt: onboarding.vendorProfile?.verifiedAt ?? null,
      documents,
      applications: (onboarding.vendorProfile?.verificationApplications ?? []).map((application) => ({
        id: application.id,
        publicId: application.publicId,
        status: application.status,
        submittedAt: application.submittedAt,
        reviewStartedAt: application.reviewStartedAt,
        decidedAt: application.decidedAt,
        rejectionReason: application.rejectionReason,
        decisionBy: application.decisionBy?.name ?? null,
        documentCount: application.documents.length,
      })),
    };
  }

  static async resolveForAdmin(source: VerificationDocumentSource, id: string) {
    const admin = await requireAdminContext("platform:manage_verifications");
    const record = source === "profile"
      ? await prisma.document.findUnique({ where: { id }, select: { ...sourceSelect, vendorId: true } })
      : await prisma.vendorDocument.findUnique({ where: { id }, select: { ...sourceSelect, application: { select: { vendorProfileId: true } } } });
    const vendorId = record && ("vendorId" in record ? record.vendorId : record.application.vendorProfileId);
    if (!record || !vendorId) throw new VerificationDocumentError("Document not found.");
    const reference = parsePrivateDocumentReference(record.url, vendorId);
    if (!reference) throw new VerificationDocumentError("This document uses an unsupported legacy storage reference.", "INVALID_REFERENCE");
    await prisma.auditLog.create({ data: { vendorId, userId: admin.userId, action: "VERIFICATION_DOCUMENT_ACCESSED", entity: source === "profile" ? "Document" : "VendorDocument", entityId: id } });
    return { record, reference };
  }

  static async resolveForVendor(source: VerificationDocumentSource, id: string) {
    const context = await requireVendorContext("vendor:manage_legal", { allowInactiveShop: true });
    const record = source === "profile"
      ? await prisma.document.findFirst({ where: { id, vendorId: context.vendorId }, select: sourceSelect })
      : await prisma.vendorDocument.findFirst({ where: { id, application: { vendorProfileId: context.vendorId } }, select: sourceSelect });
    if (!record) throw new VerificationDocumentError("Document not found.");
    const reference = parsePrivateDocumentReference(record.url, context.vendorId);
    if (!reference) throw new VerificationDocumentError("This document uses an unsupported legacy storage reference.", "INVALID_REFERENCE");
    return { record, reference };
  }

  static async download(resolved: Awaited<ReturnType<typeof VerificationDocumentService.resolveForAdmin>> | Awaited<ReturnType<typeof VerificationDocumentService.resolveForVendor>>) {
    const { data, error } = await getSupabaseServerClient().storage.from(resolved.reference.bucket).download(resolved.reference.path);
    if (error || !data) throw new VerificationDocumentError("Document storage is temporarily unavailable.", "STORAGE_ERROR");
    return data;
  }
}
