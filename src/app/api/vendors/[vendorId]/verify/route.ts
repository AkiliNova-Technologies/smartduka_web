import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { DocumentType } from "@prisma/client";
import { successResponse, errorResponse, getErrorMessage } from "@/lib/api-utils";

interface DocumentPayload {
  name: string;
  url: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  try {
    const { vendorId } = await params;
    const { documents } = (await req.json()) as {
      documents: Record<string, DocumentPayload>;
    };

    // Verify vendor exists
    const vendor = await prisma.vendorProfile.findUnique({
      where: { id: vendorId },
      include: { vendorApplication: true },
    });

    if (!vendor) {
      return errorResponse("Vendor not found.", 404);
    }

    if (!vendor.vendorApplication) {
      return errorResponse("No linked application found.", 400);
    }

    // Create document records
    const documentRecords = await Promise.all(
      Object.entries(documents).map(([type, data]) =>
        prisma.vendorDocument.create({
          data: {
            applicationId: vendor.vendorApplication!.id,
            type: type as DocumentType,
            name: data.name,
            url: data.url,
            status: "SUBMITTED",
          },
        })
      )
    );

    // Update application status to UNDER_REVIEW
    await prisma.vendorApplication.update({
      where: { id: vendor.vendorApplication.id },
      data: { status: "UNDER_REVIEW" },
    });

    return successResponse({ documents: documentRecords });
  } catch (error: unknown) {
    console.error("[Verification Upload API]", error);
    return errorResponse(getErrorMessage(error));
  }
}