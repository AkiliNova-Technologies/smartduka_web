import { NextRequest, NextResponse } from "next/server";
import { vendorService } from "@/services/vendor";
import { VerificationStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") as VerificationStatus | null;
    const search = url.searchParams.get("search") || undefined;

    const applications = await vendorService.getAllApplications({
      status: status || undefined,
      search,
    });

    const rows = applications.map((app) => ({
      id: app.id,
      storeName: app.storeName,
      storeSlug: app.storeSlug,
      businessType: app.businessType,
      businessEmail: app.businessEmail,
      businessPhone: app.businessPhone,
      streetAddress: app.streetAddress,
      city: app.city,
      district: app.district,
      hasPhysicalStore: app.hasPhysicalStore,
      status: app.status,
      createdAt: app.createdAt.toISOString(),
      userName:
        app.user.name && app.user.name.trim() ? app.user.name : "Unnamed User",
      userEmail: app.user.email,
      userPhone: app.user.phone,
      documentCount: app.documents.length,
    }));

    return NextResponse.json({ applications: rows });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}