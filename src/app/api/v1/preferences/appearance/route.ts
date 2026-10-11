import { requireActiveUserId } from "@/lib/auth/session";
import { v1Data, v1Error, v1Exception } from "@/lib/api/v1/response";
import { SettingsService, sanitizeUserSettingsPayload, UserSettingsPayloadError } from "@/services/settings";
import { normalizeAppearance } from "@/lib/appearance";

const privateHeaders = { "Cache-Control": "private, no-store" };

export async function GET() {
  try {
    const settings = await SettingsService.getSettings(await requireActiveUserId());
    return v1Data(
      normalizeAppearance({ themeMode: settings.themeMode, accentColor: settings.accentColor }),
      200,
      privateHeaders,
    );
  } catch (error) {
    if (error instanceof UserSettingsPayloadError) return v1Error("VALIDATION_ERROR", error.message, 400);
    return v1Exception(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => key !== "themeMode" && key !== "accentColor")) {
      return v1Error("VALIDATION_ERROR", "Only appearance preferences can be updated here.", 400);
    }
    const input = sanitizeUserSettingsPayload(body);
    const updates = {
      ...(input.themeMode ? { themeMode: input.themeMode } : {}),
      ...(input.accentColor ? { accentColor: input.accentColor } : {}),
    };
    if (!Object.keys(updates).length) return v1Error("VALIDATION_ERROR", "An appearance preference is required.", 400);
    const settings = await SettingsService.updateSettings(await requireActiveUserId(), updates);
    return v1Data(
      normalizeAppearance({ themeMode: settings.themeMode, accentColor: settings.accentColor }),
      200,
      privateHeaders,
    );
  } catch (error) {
    if (error instanceof UserSettingsPayloadError) return v1Error("VALIDATION_ERROR", error.message, 400);
    return v1Exception(error);
  }
}
