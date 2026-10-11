const positiveInt = (value: string | undefined, fallback: number) => Math.max(1, Math.floor(Number(value) || fallback));

export const platformRevenueConfig = {
  trialDays: positiveInt(process.env.VENDOR_TRIAL_DAYS, 30),
  introductoryCreditUgx: positiveInt(process.env.PROMOTIONAL_CREDIT_UGX, 30_000),
  creditExpiryDays: positiveInt(process.env.PROMOTIONAL_CREDIT_EXPIRY_DAYS, 30),
  productDailyRateUgx: positiveInt(process.env.PRODUCT_PROMOTION_DAILY_RATE_UGX, 10_000),
  shopDailyRateUgx: positiveInt(process.env.SHOP_PROMOTION_DAILY_RATE_UGX, 20_000),
  platformMtnEnabled: process.env.PLATFORM_PAYMENTS_MTN_ENABLED === "true",
  platformMtnEnvironment: process.env.PLATFORM_MTN_ENVIRONMENT ?? "sandbox",
  platformMtnConfigured: Boolean(process.env.PLATFORM_MTN_MERCHANT_ID || process.env.PLATFORM_MTN_MERCHANT_CODE),
  platformMtnSandboxTesting: process.env.PLATFORM_MTN_ENVIRONMENT === "sandbox" && process.env.PLATFORM_MTN_SANDBOX_TESTING_ENABLED === "true",
  platformMtnLiveTestEnabled: process.env.PLATFORM_MTN_LIVE_TEST_ENABLED === "true",
  platformMtnLiveTestRealMoneyConfirmed: process.env.PLATFORM_MTN_LIVE_TEST_CONFIRM_REAL_MONEY === "true",
  platformMtnProductionEnabled: process.env.PLATFORM_MTN_PRODUCTION_ENABLED === "true",
};
