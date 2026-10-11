import { resolveAuthenticatedUser } from "@/lib/auth/session";
import { PlatformPaymentReconciliationService } from "@/services/platform-payment-reconciliation";
import { PromotionCampaignScheduler } from "@/services/promotion-campaign-scheduler";
import { revalidateTag } from "next/cache";
import { cacheTags } from "@/lib/cache-policy";
import { SubscriptionScheduler } from "@/services/subscription-scheduler";
export async function POST(request: Request) { const actor = await resolveAuthenticatedUser(request); if (actor?.email !== "cron@platform.infrastructure") return Response.json({ error: "Unauthorized" }, { status: 401 }); const data={payments:await PlatformPaymentReconciliationService.scheduleDue(),campaigns:await PromotionCampaignScheduler.run(),subscriptions:await SubscriptionScheduler.run()};revalidateTag(cacheTags.marketplace.promotions,"max");revalidateTag(cacheTags.marketplace.discovery,"max");return Response.json({data}); }
