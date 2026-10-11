import { NextResponse } from "next/server";
import { TestDataCleanupScope } from "@prisma/client";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { cleanupErrorResponse } from "@/lib/test-data-cleanup-http";
import { TestDataCleanupError, TestDataCleanupService } from "@/services/test-data-cleanup";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (!checkRateLimit(`cleanup-preview:${request.headers.get("x-forwarded-for") ?? "local"}`, 10, 60_000)) throw new TestDataCleanupError("Too many cleanup previews. Try again shortly.", "RATE_LIMITED", 429);
    const body = await request.json() as { scope?: string; scopeId?: string | null };
    if (!body.scope || !Object.values(TestDataCleanupScope).includes(body.scope as TestDataCleanupScope)) throw new TestDataCleanupError("Choose a supported cleanup scope.", "INVALID_SCOPE");
    return NextResponse.json({ success: true, data: await TestDataCleanupService.preview({ scope: body.scope as TestDataCleanupScope, scopeId: body.scopeId }) });
  } catch (error) { return cleanupErrorResponse(error); }
}
