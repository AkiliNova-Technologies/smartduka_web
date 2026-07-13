import { NextResponse } from "next/server";
import { vendorService } from "@/services/vendor";

export async function GET() {
  try {
    const stores = await vendorService.getPublicStoreListings();
    return NextResponse.json({ stores });
  } catch (error) {
    console.error("Failed to fetch public stores:", error);
    return NextResponse.json(
      { error: "Failed to fetch stores" },
      { status: 500 }
    );
  }
}