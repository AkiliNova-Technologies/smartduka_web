import { v1Data, v1Error, v1Exception } from "@/lib/api/v1/response";
import { requireVendorContext } from "@/lib/auth/vendor-context";
import { checkRateLimit } from "@/lib/rate-limit";
import { StorePublicationService } from "@/services/store-publications";
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) { try { const context = await requireVendorContext("vendor:manage_audience"); if (!checkRateLimit(`store-publication-publish:${context.vendorId}`, 10, 60 * 60_000)) return v1Error("RATE_LIMITED", "Publication limit reached. Please try again later.", 429); return v1Data(await StorePublicationService.publish((await params).id), 200, { "Cache-Control": "private, no-store" }); } catch (error) { return v1Exception(error); } }
