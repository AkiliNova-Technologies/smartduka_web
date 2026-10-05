import { errorResponse, getErrorMessage, successResponse } from "@/lib/api-utils";
import { VendorTeamError, VendorTeamService } from "@/services/vendor-team";

export async function GET() {
  try { return successResponse({ members: await VendorTeamService.list() }); }
  catch (error) { return errorResponse(getErrorMessage(error), 403); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.action === "remove") return successResponse(await VendorTeamService.remove(body.memberId));
    if (body.action === "change-role") return successResponse(await VendorTeamService.changeRole(body.memberId, body.role));
    return successResponse(await VendorTeamService.add(body.email, body.role), 201);
  } catch (error) { return errorResponse(getErrorMessage(error), error instanceof VendorTeamError ? 400 : 403); }
}
