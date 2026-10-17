import { prisma } from "@/lib/prisma/client";
import { isAccentPreset, isPlatformPersonality, isThemeMode, type AccentPreset, type PlatformPersonality, type ThemeMode } from "@/lib/appearance";

// ==========================================
// TYPES
// ==========================================

export interface UserSettingsPayload {
  fullName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  currency?: string;
  primaryLanguage?: string;
  deliveryDistrict?: string;
  momoNetwork?: string;
  momoNumber?: string;
  orderAlertsEmail?: boolean;
  orderAlertsPush?: boolean;
  securityAlertsSMS?: boolean;
  marketingNewsletter?: boolean;
  promotionalInAppNotifications?: boolean;
  shoppingRecommendations?: boolean;
  promotionalPushNotifications?: boolean;
  twoFactorEnabled?: boolean;
  buyerProtectionEnabled?: boolean;
  themeMode?: ThemeMode;
  accentColor?: AccentPreset;
  personality?: PlatformPersonality;
}

const SETTINGS_STRING_FIELDS = new Set<keyof UserSettingsPayload>([
  "fullName", "phoneNumber", "avatarUrl", "currency", "primaryLanguage",
  "deliveryDistrict", "momoNetwork", "momoNumber",
]);

const SETTINGS_BOOLEAN_FIELDS = new Set<keyof UserSettingsPayload>([
  "orderAlertsEmail", "orderAlertsPush", "securityAlertsSMS",
  "marketingNewsletter", "twoFactorEnabled", "buyerProtectionEnabled",
  "promotionalInAppNotifications", "shoppingRecommendations", "promotionalPushNotifications",
]);

export class UserSettingsPayloadError extends Error {}

/** Restricts customer updates to explicitly supported preference fields. */
export function sanitizeUserSettingsPayload(input: unknown): UserSettingsPayload {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new UserSettingsPayloadError("Settings payload must be an object.");
  }

  const payload: UserSettingsPayload = {};
  for (const [key, value] of Object.entries(input)) {
    const settingsKey = key as keyof UserSettingsPayload;
    if (!SETTINGS_STRING_FIELDS.has(settingsKey) && !SETTINGS_BOOLEAN_FIELDS.has(settingsKey)) {
      if (settingsKey === "themeMode") {
        if (!isThemeMode(value)) throw new UserSettingsPayloadError("Unsupported theme mode.");
        payload.themeMode = value;
        continue;
      }
      if (settingsKey === "accentColor") {
        if (!isAccentPreset(value)) throw new UserSettingsPayloadError("Unsupported accent colour.");
        payload.accentColor = value;
        continue;
      }
      if (settingsKey === "personality") {
        if (!isPlatformPersonality(value)) throw new UserSettingsPayloadError("Unsupported platform personality.");
        payload.personality = value;
        continue;
      }
      throw new UserSettingsPayloadError("Unsupported settings field: " + key);
    }

    if (SETTINGS_STRING_FIELDS.has(settingsKey)) {
      if (value !== undefined && value !== null && typeof value !== "string") {
        throw new UserSettingsPayloadError("Settings field " + key + " must be a string or null.");
      }
    } else if (typeof value !== "boolean") {
      throw new UserSettingsPayloadError("Settings field " + key + " must be a boolean.");
    }

    (payload as Record<string, unknown>)[key] = value;
  }

  return payload;
}

// ==========================================
// SETTINGS SERVICE
// ==========================================

export class SettingsService {
  /**
   * Get user settings — creates defaults if none exist
   */
  static async getSettings(userId: string) {
    let settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId,
          currency: "UGX",
          primaryLanguage: "en",
          orderAlertsEmail: true,
          orderAlertsPush: true,
          securityAlertsSMS: true,
          marketingNewsletter: false,
          promotionalInAppNotifications: false,
          shoppingRecommendations: false,
          promotionalPushNotifications: false,
          twoFactorEnabled: false,
          buyerProtectionEnabled: true,
          themeMode: "system",
          accentColor: "classic",
          personality: "LOVELY",
        },
      });
    }

    return settings;
  }

  /**
   * Update user settings — upsert to handle missing records
   */
  static async updateSettings(userId: string, data: UserSettingsPayload) {
    const safeData = sanitizeUserSettingsPayload(data);
    return prisma.userSettings.upsert({
      where: { userId },
      update: {
        ...safeData,
        updatedAt: new Date(),
      },
      create: {
        userId,
        fullName: safeData.fullName ?? null,
        phoneNumber: safeData.phoneNumber ?? null,
        avatarUrl: safeData.avatarUrl ?? null,
        currency: safeData.currency || "UGX",
        primaryLanguage: safeData.primaryLanguage || "en",
        deliveryDistrict: safeData.deliveryDistrict ?? null,
        momoNetwork: safeData.momoNetwork ?? null,
        momoNumber: safeData.momoNumber ?? null,
        orderAlertsEmail: safeData.orderAlertsEmail ?? true,
        orderAlertsPush: safeData.orderAlertsPush ?? true,
        securityAlertsSMS: safeData.securityAlertsSMS ?? true,
        marketingNewsletter: safeData.marketingNewsletter ?? false,
        promotionalInAppNotifications: safeData.promotionalInAppNotifications ?? false,
        shoppingRecommendations: safeData.shoppingRecommendations ?? false,
        promotionalPushNotifications: safeData.promotionalPushNotifications ?? false,
        twoFactorEnabled: safeData.twoFactorEnabled ?? false,
        buyerProtectionEnabled: safeData.buyerProtectionEnabled ?? true,
        themeMode: safeData.themeMode ?? "system",
        accentColor: safeData.accentColor ?? "classic",
        personality: safeData.personality ?? "LOVELY",
      },
    });
  }
}
