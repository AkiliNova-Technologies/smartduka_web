import { parsePage, v1Exception, v1Paginated } from "@/lib/api/v1/response";
import { requireActiveUserId } from "@/lib/auth/session";
import { StoreFollowingService } from "@/services/store-following";
export async function GET(request: Request) { try { const customerId = await requireActiveUserId(); const pagination = parsePage(new URL(request.url).searchParams); const result = await StoreFollowingService.activity(customerId, pagination.page, pagination.pageSize); const response = v1Paginated(result.items, { ...pagination, total: result.total }); response.headers.set("Cache-Control", "private, no-store"); return response; } catch (error) { return v1Exception(error); } }
