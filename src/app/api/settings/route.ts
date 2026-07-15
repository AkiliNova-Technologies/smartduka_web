import { NextRequest } from "next/server";
import { SettingsService } from "@/services/settings";
import { successResponse, errorResponse, getErrorMessage } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-marketplace-user-id");
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const settings = await SettingsService.getSettings(userId);
    return successResponse(settings);
  } catch (error: unknown) {
    console.error("[Settings API GET]", error);
    return errorResponse(getErrorMessage(error));
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = req.headers.get("x-marketplace-user-id");
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const body = await req.json();
    const settings = await SettingsService.updateSettings(userId, body);
    return successResponse(settings);
  } catch (error: unknown) {
    console.error("[Settings API PATCH]", error);
    return errorResponse(getErrorMessage(error));
  }
}