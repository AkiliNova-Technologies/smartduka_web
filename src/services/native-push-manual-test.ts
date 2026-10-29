import { requireAdminContext } from "@/lib/auth/admin-context";
import { NotificationWorkerService } from "@/services/notification-worker";

export class NativePushManualTestDisabledError extends Error {}

export function nativePushManualTestEnabled() {
  return process.env.NATIVE_PUSH_MANUAL_TEST_ENABLED === "true";
}

export class NativePushManualTestService {
  static async run(requestId: string) {
    const admin = await requireAdminContext("platform:manage_announcements");
    if (!nativePushManualTestEnabled()) {
      throw new NativePushManualTestDisabledError(
        "Manual native push testing is disabled in this environment.",
      );
    }
    return NotificationWorkerService.runIsolatedNativeTest({
      userId: admin.userId,
      requestId,
    });
  }
}
