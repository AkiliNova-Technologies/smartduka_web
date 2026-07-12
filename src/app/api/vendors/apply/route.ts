import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { VerificationStatus } from "@prisma/client";
import { vendorService } from "@/services/vendor";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId") || req.headers.get("x-marketplace-user-id");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    const application = await vendorService.getMyApplication(userId);
    const profile = await vendorService.getVendorProfileByOwner(userId);

    if (!application && !profile) {
      return NextResponse.json(
        { error: "No vendor application or profile found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ application, profile });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

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

    // Required core fields — financial fields are intentionally optional (COD-first era)
    if (!userId || !storeName || !storeSlug || !businessEmail || !businessPhone) {
      return NextResponse.json(
        { error: "Missing required core application fields." },
        { status: 400 }
      );
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(storeSlug)) {
      return NextResponse.json(
        { error: "Store slug must contain only lowercase letters, numbers, and hyphens." },
        { status: 400 }
      );
    }

    // Duplication guard: slug uniqueness
    const existingSlug = await prisma.vendorApplication.findUnique({
      where: { storeSlug },
    });

    if (existingSlug) {
      return NextResponse.json(
        { error: "This store name/slug is already taken by another merchant." },
        { status: 409 }
      );
    }

    // Duplication guard: one application per user
    const existingApp = await prisma.vendorApplication.findUnique({
      where: { userId },
    });

    if (existingApp) {
      return NextResponse.json(
        { error: "You have already submitted a vendor application. Please wait for review." },
        { status: 400 }
      );
    }

    // Validate momoNumber format only if network is selected
    if (momoNetwork && momoNumber) {
      const momoRegex = /^(07|\+2567|2567)\d{8}$/;
      if (!momoRegex.test(momoNumber.replace(/\s/g, ""))) {
        return NextResponse.json(
          { error: "Please provide a valid Ugandan mobile money number (e.g., 077XXXXXXX)." },
          { status: 400 }
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
        // Financial fields — optional in COD-first era
        momoNetwork: momoNetwork || null,
        momoNumber: momoNumber || null,
        bankName: bankName || null,
        bankAccountName: bankAccountName || null,
        bankAccountNumber: bankAccountNumber || null,
        status: VerificationStatus.PENDING,
      },
    });

    return NextResponse.json({ 
      success: true, 
      application: {
        id: application.id,
        storeName: application.storeName,
        status: application.status,
        createdAt: application.createdAt,
      }
    });
  } catch (error: unknown) {
    console.error("KYC Application DB Insertion Error:", error);
    
    // Handle Prisma unique constraint violations gracefully
    if (typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json(
        { error: "A duplicate record was detected. This store slug or user may already have an application." },
        { status: 409 }
      );
    }

    const message = error instanceof Error ? error.message : "Internal server error. Please try again or contact support.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}