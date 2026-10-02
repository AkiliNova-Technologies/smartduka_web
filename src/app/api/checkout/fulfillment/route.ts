import { NextRequest } from "next/server";
import { requireActiveUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { errorResponse, successResponse } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    await requireActiveUserId();
    const vendorIds = [...new Set(request.nextUrl.searchParams.getAll("vendorId").filter((id) => /^[a-zA-Z0-9-]{1,64}$/.test(id)))].slice(0, 20);
    if (!vendorIds.length) return successResponse({ shops: [] });
    const shops = await prisma.vendorProfile.findMany({
      where: { id: { in: vendorIds }, status: "ACTIVE", deletedAt: null },
      select: { id: true, storeName: true, fulfillmentMethods: true, deliveryFee: true, deliveryEstimate: true, pickupLocation: true, pickupDirections: true, pickupInstructions: true, returnWindowDays: true, returnPolicy: true, acceptsExchanges: true, exchangePolicy: true },
    });
    return successResponse({ shops: shops.map((shop) => ({ ...shop, deliveryFee: Number(shop.deliveryFee) })) });
  } catch {
    return errorResponse("Unable to load fulfilment options.", 400);
  }
}
