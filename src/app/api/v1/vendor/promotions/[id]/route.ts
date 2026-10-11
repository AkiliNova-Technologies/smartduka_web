import { revalidateTag } from "next/cache";
import { v1Data, v1Error, v1Exception } from "@/lib/api/v1/response";
import { cacheTags } from "@/lib/cache-policy";
import { VendorPromotionsService } from "@/services/vendor-promotions";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) { try { const campaign = await VendorPromotionsService.detail((await params).id); return campaign ? v1Data(campaign, 200, { "Cache-Control": "private, no-store" }) : v1Error("NOT_FOUND", "Promotion campaign not found.", 404); } catch (error) { return v1Exception(error); } }
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) { try { const cancelled=await VendorPromotionsService.cancel((await params).id);revalidateTag(cacheTags.marketplace.promotions,"max");revalidateTag(cacheTags.marketplace.discovery,"max");return v1Data(cancelled); } catch (error) { return v1Exception(error); } }
