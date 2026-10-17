export const MARKETING_DAILY_LIMIT = Math.max(1, Math.min(5, Number(process.env.NEXT_PUBLIC_MARKETING_IN_APP_DAILY_LIMIT ?? 2) || 2));
