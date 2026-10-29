import { z } from "zod";
import { AdminAuthorizationError } from "@/lib/auth/admin-context";
import { errorResponse, successResponse } from "@/lib/api-utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/request-origin";
import {
  NativePushManualTestDisabledError,
  NativePushManualTestService,
} from "@/services/native-push-manual-test";
import { PushTestDeliveryError } from "@/services/push-delivery-outbox";

const requestSchema = z.object({ requestId: z.string().uuid() }).strict();

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (
      !checkRateLimit(
        `native-push-manual-test:${request.headers.get("x-forwarded-for") ?? "local"}`,
        3,
        60 * 60_000,
      )
    ) {
      return errorResponse("Too many native push test requests.", 429);
    }
    const input = requestSchema.parse(await request.json());
    return successResponse(await NativePushManualTestService.run(input.requestId));
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return errorResponse("Administrative permission denied.", 403);
    }
    if (error instanceof NativePushManualTestDisabledError) {
      return errorResponse(error.message, 503);
    }
    if (error instanceof PushTestDeliveryError) {
      const status = error.code === "NO_ACTIVE_SUBSCRIPTION" ? 404 : error.code === "UNAVAILABLE" ? 503 : 409;
      return errorResponse(error.message, status);
    }
    if (error instanceof z.ZodError) {
      return errorResponse("Invalid native push test request.", 400);
    }
    return errorResponse("Unable to run the native push test.", 500);
  }
}
