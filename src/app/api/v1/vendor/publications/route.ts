import { v1Data, v1Error, v1Exception, v1Paginated } from "@/lib/api/v1/response";
import { checkRateLimit } from "@/lib/rate-limit";
import { storePublicationFilters, storePublicationInputSchema } from "@/lib/store-publication-schema";
import { requireVendorContext } from "@/lib/auth/vendor-context";
import { StorePublicationService } from "@/services/store-publications";

export async function GET(request: Request) { try { const input = storePublicationFilters(new URL(request.url).searchParams), result = await StorePublicationService.list(input); const response = v1Paginated(result.items, { page: input.page, pageSize: input.pageSize, total: result.total }); response.headers.set("Cache-Control", "private, no-store"); return response; } catch (error) { return v1Exception(error); } }
export async function POST(request: Request) { try { const context = await requireVendorContext("vendor:manage_audience"); if (!checkRateLimit(`store-publication-create:${context.user.id}`, 20, 60 * 60_000)) return v1Error("RATE_LIMITED", "Too many publication drafts. Please try again later.", 429); return v1Data(await StorePublicationService.create(storePublicationInputSchema.parse(await request.json())), 201, { "Cache-Control": "private, no-store" }); } catch (error) { return v1Exception(error); } }
