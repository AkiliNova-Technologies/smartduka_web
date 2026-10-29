import { timingSafeEqual } from "node:crypto";
import { NotificationWorkerService } from "@/services/notification-worker";

export const dynamic = "force-dynamic";

export function scheduledNotificationWorkerEnabled() {
  return process.env.SCHEDULED_NOTIFICATION_WORKER_ENABLED === "true";
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const actual = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (actual.length !== expected.length) return false;

  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json(
      { error: { code: "UNAUTHORIZED", message: "Unauthorized." } },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!scheduledNotificationWorkerEnabled()) {
    return Response.json(
      { data: { disabled: true } },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const data = await NotificationWorkerService.run();
    return Response.json(
      { data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      {
        error: {
          code: "WORKER_FAILED",
          message: "Push delivery worker failed.",
        },
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
