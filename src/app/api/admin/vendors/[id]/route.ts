import { NextRequest, NextResponse } from "next/server";
import { vendorService } from "@/services/vendor";
import { VerificationStatus } from "@prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Vendor ID is required." }, { status: 400 });
    }

    const body = await req.json();
    const { status, reviewerNotes } = body;

    if (!status || !Object.values(VerificationStatus).includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${Object.values(VerificationStatus).join(", ")}` },
        { status: 400 }
      );
    }

    const application = await vendorService.updateApplicationStatus(
      id,
      status as VerificationStatus,
      reviewerNotes || null,
      "admin"
    );

    return NextResponse.json({ success: true, application });
  } catch (error: unknown) {
    console.error("Vendor status update error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}