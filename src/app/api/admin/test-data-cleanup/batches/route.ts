import { NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { cleanupErrorResponse } from "@/lib/test-data-cleanup-http";
import { TestDataCleanupError, TestDataCleanupService } from "@/services/test-data-cleanup";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await request.json() as { name?: string; description?: string; records?: Array<{ entityType: string; entityId: string; financialDisposition?: "NOT_FINANCIAL" | "SIMULATED" | "PROTECTED"; externalIdentity?: { provider: "FIREBASE"; externalId: string } }> };
    if (typeof body.name !== "string" || !Array.isArray(body.records)) throw new TestDataCleanupError("A name and explicit record selection are required.", "INVALID_BATCH");
    return NextResponse.json({ success: true, data: await TestDataCleanupService.createDraftBatch({ name: body.name, description: body.description, records: body.records }) }, { status: 201 });
  } catch (error) { return cleanupErrorResponse(error); }
}
