import { errorResponse, getErrorMessage, successResponse } from "@/lib/api-utils";
import { ShopVerificationService } from "@/services/shop-verifications";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams;
    if (query.get("admins") === "1") return successResponse({ admins: await ShopVerificationService.eligibleAdmins() });
    return successResponse(await ShopVerificationService.listForAdmin({ status: query.get("status") as never, assignedAdminId: query.get("assignedAdminId") || undefined, unassigned: query.get("unassigned") === "true", view: query.get("view") || undefined, page: Number(query.get("page") || 1), limit: Number(query.get("limit") || 25) }));
  } catch (error) { return errorResponse(getErrorMessage(error), 403); }
}
