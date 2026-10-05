import { NextRequest } from "next/server";
import { inventoryQuerySchema } from "@/lib/api/v1/contracts";
import { VendorInventoryService } from "@/services/vendor-inventory";
import { parsePage, v1Exception, v1Paginated } from "@/lib/api/v1/response";
export async function GET(request: NextRequest) { try { const { page, pageSize } = parsePage(request.nextUrl.searchParams); const query = inventoryQuerySchema.parse({ q: request.nextUrl.searchParams.get("q") ?? undefined, lowStockOnly: request.nextUrl.searchParams.get("lowStockOnly") ?? undefined }); const result = await VendorInventoryService.list({ page, pageSize, q: query.q, lowStockOnly: query.lowStockOnly === "true" }); return v1Paginated(result.data, { page, pageSize, total: result.total }); } catch (error) { return v1Exception(error); } }
