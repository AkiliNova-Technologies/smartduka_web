import { MarketingNotificationAudience, Prisma } from "@prisma/client";

export type MarketingConsentSettings = {
  promotionalInAppNotifications: boolean;
  promotionalPushNotifications?: boolean;
  shoppingRecommendations: boolean;
} | null | undefined;

export function eligibleMarketingAudiences(settings: MarketingConsentSettings) {
  if (!settings?.promotionalInAppNotifications) return [] as MarketingNotificationAudience[];
  return [
    MarketingNotificationAudience.PROMOTIONAL_OPT_IN,
    ...(settings.shoppingRecommendations ? [MarketingNotificationAudience.RECOMMENDATIONS_OPT_IN] : []),
  ];
}

export function marketingConsentEligible(settings: MarketingConsentSettings, audience: MarketingNotificationAudience, requirePush: boolean) {
  return eligibleMarketingAudiences(settings).includes(audience) && (!requirePush || settings?.promotionalPushNotifications === true);
}

export function marketingSettingsWhere(audience: MarketingNotificationAudience, requirePush: boolean): Prisma.UserSettingsWhereInput {
  return {
    promotionalInAppNotifications: true,
    ...(requirePush ? { promotionalPushNotifications: true } : {}),
    ...(audience === MarketingNotificationAudience.RECOMMENDATIONS_OPT_IN ? { shoppingRecommendations: true } : {}),
  };
}
