import { AnnouncementService } from "@/services/announcements";
import { MarketingNotificationService } from "@/services/marketing-notifications";
import { PushDeliveryOutboxService } from "@/services/push-delivery-outbox";

/**
 * Advances notification publication before fanout and transport delivery.
 * Each downstream service owns its durable locks and idempotency boundaries.
 */
export class NotificationWorkerService {
  static async run() {
    const announcements = await AnnouncementService.advanceLifecycle();
    const marketing = await MarketingNotificationService.advanceLifecycle();
    const push = await PushDeliveryOutboxService.run();

    return { announcements, marketing, push };
  }

  static async runIsolatedNativeTest(input: {
    userId: string;
    requestId: string;
  }) {
    return PushDeliveryOutboxService.runIsolatedNativeTest(input);
  }
}
