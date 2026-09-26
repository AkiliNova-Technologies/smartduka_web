import { prisma } from "@/lib/prisma/client";

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
  twoFactorEnabled?: boolean;
  buyerProtectionEnabled?: boolean;
}

const SETTINGS_STRING_FIELDS = new Set<keyof UserSettingsPayload>([
  "fullName", "phoneNumber", "avatarUrl", "currency", "primaryLanguage",
  "deliveryDistrict", "momoNetwork", "momoNumber",
]);

const SETTINGS_BOOLEAN_FIELDS = new Set<keyof UserSettingsPayload>([
  "orderAlertsEmail", "orderAlertsPush", "securityAlertsSMS",
  "marketingNewsletter", "twoFactorEnabled", "buyerProtectionEnabled",
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
          twoFactorEnabled: false,
          buyerProtectionEnabled: true,
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
        twoFactorEnabled: safeData.twoFactorEnabled ?? false,
        buyerProtectionEnabled: safeData.buyerProtectionEnabled ?? true,
      },
    });
  }
}