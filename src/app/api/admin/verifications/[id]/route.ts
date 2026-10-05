import { ShopVerificationStatus } from "@prisma/client";
import { errorResponse, getErrorMessage, successResponse } from "@/lib/api-utils";
import { ShopVerificationError, ShopVerificationService } from "@/services/shop-verifications";

export async function GET(_request: Request, context: RouteContext<"/api/admin/verifications/[id]">) {
  try { const { id } = await context.params; const application = await ShopVerificationService.getForAdmin(id); return application ? successResponse({ application }) : errorResponse("Verification application not found.", 404); }
  catch (error) { return errorResponse(getErrorMessage(error), 403); }
}

export async function PATCH(request: Request, context: RouteContext<"/api/admin/verifications/[id]">) {
  try {
    const { id } = await context.params; const body = await request.json();
    if (body.assignedAdminId) return successResponse(await ShopVerificationService.assign(id, body.assignedAdminId));
    if (body.note) return successResponse(await ShopVerificationService.addNote(id, body.note));
    if (body.status && Object.values(ShopVerificationStatus).includes(body.status)) return successResponse(await ShopVerificationService.transition(id, body.status, body.reason));
    return errorResponse("No verification update supplied.", 400);
  } catch (error) { return errorResponse(getErrorMessage(error), error instanceof ShopVerificationError ? 400 : 403); }
}
