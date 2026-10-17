import { z } from "zod";
import { Prisma } from "@prisma/client";
import { assertSameOrigin } from "@/lib/request-origin";
import { checkRateLimit } from "@/lib/rate-limit";
import { browserPushSubscriptionSchema } from "@/lib/push-subscription-schema";
import { v1Data, v1Exception, v1Error } from "@/lib/api/v1/response";
import { BrowserPushSubscriptionError, BrowserPushSubscriptionService } from "@/services/browser-push-subscriptions";

function failure(error: unknown) {
  if (error instanceof BrowserPushSubscriptionError) return v1Error(error.code === "OWNERSHIP_CONFLICT" ? "CONFLICT" : error.code, error.message, error.code === "OWNERSHIP_CONFLICT" ? 409 : error.code === "UNAVAILABLE" ? 503 : 400);
  if (error instanceof z.ZodError) {
    const fields = Object.fromEntries(error.issues.map((issue) => [issue.path.join(".") || "request", issue.message]));
    // Paths and validation messages are safe diagnostics; never log the endpoint or keys.
    console.warn("[browser-push-subscription] rejected payload", { fields: Object.keys(fields) });
    return v1Error("INVALID_SUBSCRIPTION", "Your browser sent an invalid push subscription. Please try again.", 400, fields);
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return v1Error("CONFLICT", "This browser subscription was updated concurrently. Please try again.", 409);
  if (error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Prisma.PrismaClientInitializationError) {
    console.error("[browser-push-subscription] storage unavailable", { code: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : error.errorCode });
    return v1Error("PUSH_STORAGE_UNAVAILABLE", "Push subscriptions are temporarily unavailable. Please try again shortly.", 503);
  }
  return v1Exception(error);
}

export async function GET() { try { return v1Data(await BrowserPushSubscriptionService.status(), 200, { "Cache-Control": "private, no-store" }); } catch (error) { return failure(error); } }
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (!checkRateLimit(`browser-push-subscribe:${request.headers.get("x-forwarded-for") ?? "local"}`, 12, 60_000)) return v1Error("RATE_LIMITED", "Too many notification requests. Please try again shortly.", 429);
    return v1Data(await BrowserPushSubscriptionService.register(browserPushSubscriptionSchema.parse(await request.json()), request.headers.get("user-agent")), 201);
  } catch (error) { return failure(error); }
}
export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    if (!checkRateLimit(`browser-push-unsubscribe:${request.headers.get("x-forwarded-for") ?? "local"}`, 12, 60_000)) return v1Error("RATE_LIMITED", "Too many notification requests. Please try again shortly.", 429);
    const body = await request.json().catch(() => ({}));
    const endpoint = z.object({ endpoint: z.string().url().max(2048).optional() }).strict().parse(body).endpoint;
    return v1Data(await BrowserPushSubscriptionService.remove(endpoint));
  } catch (error) { return failure(error); }
}
