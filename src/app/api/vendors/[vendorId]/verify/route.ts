import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { DocumentType } from "@prisma/client";

interface DocumentPayload {
  name: string;
  url: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  try {
    const { vendorId } = await params; // params is a Promise, must await

    const { documents } = await req.json() as { documents: Record<string, DocumentPayload> };

    // Verify vendor exists and is APPROVED
    const vendor = await prisma.vendorProfile.findUnique({
      where: { id: vendorId },
      include: { vendorApplication: true },
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found." }, { status: 404 });
    }

    if (!vendor.vendorApplication) {
      return NextResponse.json({ error: "No linked application found." }, { status: 400 });
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

    return NextResponse.json({ success: true, documents: documentRecords });
  } catch (error) {
    console.error("Verification upload error:", error);
    return NextResponse.json(
      { error: "Failed to process verification documents." },
      { status: 500 }
    );
  }
}