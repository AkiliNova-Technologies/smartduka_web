import { prisma } from "@/lib/prisma/client";

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

export const settingsService = {
  async getSettings(userId: string) {
    if (!prisma) {
      throw new Error("Database client not initialized");
    }

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
  },

  async updateSettings(userId: string, data: UserSettingsPayload) {
    if (!prisma) {
      throw new Error("Database client not initialized");
    }

    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: {
        ...data,
        updatedAt: new Date(),
      },
      create: {
        userId,
        fullName: data.fullName ?? null,
        phoneNumber: data.phoneNumber ?? null,
        avatarUrl: data.avatarUrl ?? null,
        currency: data.currency || "UGX",
        primaryLanguage: data.primaryLanguage || "en",
        deliveryDistrict: data.deliveryDistrict ?? null,
        momoNetwork: data.momoNetwork ?? null,
        momoNumber: data.momoNumber ?? null,
        orderAlertsEmail: data.orderAlertsEmail ?? true,
        orderAlertsPush: data.orderAlertsPush ?? true,
        securityAlertsSMS: data.securityAlertsSMS ?? true,
        marketingNewsletter: data.marketingNewsletter ?? false,
        twoFactorEnabled: data.twoFactorEnabled ?? false,
        buyerProtectionEnabled: data.buyerProtectionEnabled ?? true,
      },
    });

    return settings;
  },
};