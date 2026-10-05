import { NextRequest } from "next/server";
import { requireVendorContext } from "@/lib/auth/vendor-context";
import { getVendorOrders } from "@/services/vendor-orders";
import { parsePage, v1Data, v1Exception } from "@/lib/api/v1/response";
export async function GET(request: NextRequest) { try { const context = await requireVendorContext("vendor:view_orders"); const { page, pageSize } = parsePage(request.nextUrl.searchParams); return v1Data(await getVendorOrders(context.vendorId, { page, pageSize, status: request.nextUrl.searchParams.get("status") ?? undefined, search: request.nextUrl.searchParams.get("q") ?? undefined }), 200, { "Cache-Control": "private, no-store" }); } catch (error) { return v1Exception(error); } }
