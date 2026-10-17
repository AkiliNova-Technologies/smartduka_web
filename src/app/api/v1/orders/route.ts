import { requireActiveUserId } from "@/lib/auth/session";
import { OrderService } from "@/services/order";
import { v1Exception } from "@/lib/api/v1/response";
const FILTERS = new Set(["all", "awaiting-payment", "in-progress", "completed", "cancelled"]);
export async function GET(request: Request) { try {
  const params = new URL(request.url).searchParams;
  const rawPage = params.get("page") ?? "1";
  const page = Number(rawPage);
  const filter = params.get("filter") ?? "all";
  if (!/^\d+$/.test(rawPage) || !Number.isSafeInteger(page) || page < 1 || page > 214_748_364 || !FILTERS.has(filter)) {
    return Response.json({ error: { code: "VALIDATION_ERROR", message: "Invalid order page or filter." } }, { status: 400 });
  }
  const pageSize = 10;
  const result = await OrderService.getUserOrdersPage(await requireActiveUserId(), { page, pageSize, filter });
  return Response.json({ data: result.orders, meta: { page, pageSize, total: result.total, pageCount: Math.ceil(result.total / pageSize), hasMore: page * pageSize < result.total } }, { headers: { "Cache-Control": "private, no-store" } });
} catch (error) { return v1Exception(error); } }
