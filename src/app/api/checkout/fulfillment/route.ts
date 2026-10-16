import { NextRequest } from "next/server";
import { requireActiveUserId } from "@/lib/auth/session";
import { errorResponse, successResponse } from "@/lib/api-utils";
import { getPublicFulfillmentOptions } from "@/services/fulfillment-options";
import { getBasketBranchAvailability } from "@/services/fulfillment-options";
import { z } from "zod";

const basketSchema = z.object({ shops: z.array(z.object({ vendorId: z.string().min(1).max(64), method: z.enum(["PICKUP", "DELIVERY"]).optional(), district: z.string().trim().max(120).optional(), items: z.array(z.object({ productId: z.string().min(1).max(64), variantId: z.string().min(1).max(64).nullable().optional(), quantity: z.number().int().positive().max(10_000) }).strict()).min(1).max(100) }).strict()).min(1).max(20) }).strict();

export async function GET(request: NextRequest) {
  try {
    await requireActiveUserId();
    const vendorIds = [...new Set(request.nextUrl.searchParams.getAll("vendorId").filter((id) => /^[a-zA-Z0-9-]{1,64}$/.test(id)))].slice(0, 20);
    if (!vendorIds.length) return successResponse({ shops: [] });
    return successResponse({ shops: await getPublicFulfillmentOptions(vendorIds) });
  } catch {
    return errorResponse("Unable to load fulfilment options.", 400);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireActiveUserId();
    const input = basketSchema.parse(await request.json());
    const availability = await Promise.all(input.shops.map((shop) => getBasketBranchAvailability(shop.vendorId, shop.items, { method: shop.method, district: shop.district })));
    return successResponse({ shops: availability.filter(Boolean) });
  } catch { return errorResponse("Unable to check branch availability.", 400); }
}
