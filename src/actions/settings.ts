"use server";

import { SettingsService, UserSettingsPayload } from "@/services/settings";
import { getCurrentUserId } from "@/lib/auth/session";
import { withErrorHandling } from "@/lib/api-utils";

export async function getUserSettings() {
  return withErrorHandling(async () => {
    const userId = await getCurrentUserId();
    return SettingsService.getSettings(userId);
  }, "getUserSettings");
}

export async function updateUserSettings(data: UserSettingsPayload) {
  return withErrorHandling(async () => {
    const userId = await getCurrentUserId();
    return SettingsService.updateSettings(userId, data);
  }, "updateUserSettings");
}