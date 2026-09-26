import { NextRequest } from "next/server";
import {
  SettingsService,
  sanitizeUserSettingsPayload,
  UserSettingsPayloadError,
} from "@/services/settings";
import { AuthenticationRequiredError, requireActiveUserId } from "@/lib/auth/session";
import { successResponse, errorResponse, getErrorMessage } from "@/lib/api-utils";

export async function GET(_req: NextRequest) {
  try {
    const userId = await requireActiveUserId();

    const settings = await SettingsService.getSettings(userId);
    return successResponse(settings);
  } catch (error: unknown) {
    console.error("[Settings API GET]", error);
    return errorResponse(
      getErrorMessage(error),
      error instanceof UserSettingsPayloadError
        ? 400
        : error instanceof AuthenticationRequiredError
          ? 401
          : 500,
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await requireActiveUserId();

    const body = sanitizeUserSettingsPayload(await req.json());
    const settings = await SettingsService.updateSettings(userId, body);
    return successResponse(settings);
  } catch (error: unknown) {
    console.error("[Settings API PATCH]", error);
    return errorResponse(
      getErrorMessage(error),
      error instanceof UserSettingsPayloadError
        ? 400
        : error instanceof AuthenticationRequiredError
          ? 401
          : 500,
    );
  }
}