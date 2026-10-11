import { NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { cleanupErrorResponse } from "@/lib/test-data-cleanup-http";
import { TestDataCleanupError, TestDataCleanupService } from "@/services/test-data-cleanup";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (!checkRateLimit(`cleanup-execute:${request.headers.get("x-forwarded-for") ?? "local"}`, 5, 60_000)) throw new TestDataCleanupError("Too many cleanup attempts. Try again shortly.", "RATE_LIMITED", 429);
    const body = await request.json() as { planId?: string; confirmation?: string };
    if (!body.planId || typeof body.confirmation !== "string") throw new TestDataCleanupError("A cleanup plan and confirmation phrase are required.", "INVALID_REQUEST");
    return NextResponse.json({ success: true, data: await TestDataCleanupService.execute({ planId: body.planId, confirmation: body.confirmation }) });
  } catch (error) { return cleanupErrorResponse(error); }
}
