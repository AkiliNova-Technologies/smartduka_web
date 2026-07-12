"use server";

import { settingsService, UserSettingsPayload } from "@/services/settings";
import { getCurrentUserId } from "@/lib/auth/session";

export async function getUserSettings() {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");

  return settingsService.getSettings(userId);
}

export async function updateUserSettings(data: UserSettingsPayload) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");

  return settingsService.updateSettings(userId, data);
}