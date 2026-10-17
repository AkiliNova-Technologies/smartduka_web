import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireActiveUserId } from "@/lib/auth/session";
import { v1Data, v1Error, v1Exception } from "@/lib/api/v1/response";
import { pushTestRequestSchema, pushTestStatusQuerySchema } from "@/lib/push-test-schema";
import { assertSameOrigin } from "@/lib/request-origin";
import { checkRateLimit } from "@/lib/rate-limit";
import { hashPushEndpoint } from "@/lib/web-push-config";
import { PushDeliveryOutboxService, PushTestDeliveryError } from "@/services/push-delivery-outbox";

function failure(error: unknown) {
  if (error instanceof PushTestDeliveryError) {
    const status = error.code === "UNAVAILABLE" ? 503 : error.code === "NO_ACTIVE_SUBSCRIPTION" ? 404 : 409;
    const code = error.code === "NO_ACTIVE_SUBSCRIPTION" ? "NO_ACTIVE_SUBSCRIPTION" : error.code === "UNAVAILABLE" ? "PUSH_UNAVAILABLE" : "CONFLICT";
    return v1Error(code, error.message, status);
  }
  if (error instanceof z.ZodError) return v1Error("VALIDATION_ERROR", "Invalid request.", 400);
  if (error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Prisma.PrismaClientInitializationError) {
    console.error("[push-test] storage unavailable", { code: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : error.errorCode });
    return v1Error("PUSH_STORAGE_UNAVAILABLE", "Push delivery is temporarily unavailable. Please try again shortly.", 503);
  }
  return v1Exception(error);
}

/** Queues a fixed, current-browser-only delivery. No push payload or recipient is accepted from the client. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const userId = await requireActiveUserId();
    const input = pushTestRequestSchema.parse(await request.json());
    const endpointHash = hashPushEndpoint(input.endpoint);
    if (!checkRateLimit(`browser-push-test:account:${userId}`, 3, 60 * 60_000) || !checkRateLimit(`browser-push-test:subscription:${endpointHash}`, 3, 60 * 60_000)) {
      return v1Error("RATE_LIMITED", "You can send up to three test notifications per hour. Please try again later.", 429);
    }
    return v1Data(await PushDeliveryOutboxService.enqueueTest({ userId, endpointHash, requestId: input.requestId }), 202, { "Cache-Control": "no-store" });
  } catch (error) { return failure(error); }
}

/** Narrow, authenticated inspection for the opaque request identifier returned to this browser. */
export async function GET(request: Request) {
  try {
    const userId = await requireActiveUserId();
    const input = pushTestStatusQuerySchema.parse({ requestId: new URL(request.url).searchParams.get("requestId") });
    return v1Data(await PushDeliveryOutboxService.testStatus({ userId, requestId: input.requestId }), 200, { "Cache-Control": "private, no-store" });
  } catch (error) { return failure(error); }
}
