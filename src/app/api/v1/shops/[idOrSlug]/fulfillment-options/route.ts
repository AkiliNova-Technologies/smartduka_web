import { prisma } from "@/lib/prisma/client";
import { v1Data, v1Error, v1Exception } from "@/lib/api/v1/response";
import { getPublicFulfillmentOptions } from "@/services/fulfillment-options";
import { getBasketBranchAvailability } from "@/services/fulfillment-options";
import { z } from "zod";

const basketSchema = z.object({ items: z.array(z.object({ productId: z.string().uuid(), variantId: z.string().uuid().nullable().optional(), quantity: z.number().int().positive().max(10_000) }).strict()).min(1).max(100), method: z.enum(["PICKUP", "DELIVERY"]).optional(), district: z.string().trim().max(120).optional() }).strict();

export async function GET(_: Request, { params }: { params: Promise<{ idOrSlug: string }> }) {
  try {
    const { idOrSlug } = await params;
    const shop = await prisma.vendorProfile.findFirst({ where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }], status: "ACTIVE", deletedAt: null }, select: { id: true } });
    if (!shop) return v1Error("NOT_FOUND", "Shop not found.", 404);
    const [options] = await getPublicFulfillmentOptions([shop.id]);
    return v1Data(options, 200, { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" });
  } catch (error) { return v1Exception(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ idOrSlug: string }> }) {
  try {
    const { idOrSlug } = await params;
    const shop = await prisma.vendorProfile.findFirst({ where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }], status: "ACTIVE", deletedAt: null }, select: { id: true } });
    if (!shop) return v1Error("NOT_FOUND", "Shop not found.", 404);
    const input = basketSchema.parse(await request.json());
    const availability = await getBasketBranchAvailability(shop.id, input.items, { method: input.method, district: input.district });
    return availability ? v1Data(availability, 200, { "Cache-Control": "private, no-store" }) : v1Error("NOT_FOUND", "Shop not found.", 404);
  } catch (error) { return v1Exception(error); }
}
