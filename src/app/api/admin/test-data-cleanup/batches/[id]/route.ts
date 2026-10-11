import { NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { cleanupErrorResponse } from "@/lib/test-data-cleanup-http";
import { TestDataCleanupError, TestDataCleanupService } from "@/services/test-data-cleanup";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const body = await request.json() as { decision?: "VERIFY" | "REVOKE"; note?: string };
    if (!body.decision || !["VERIFY", "REVOKE"].includes(body.decision) || typeof body.note !== "string") throw new TestDataCleanupError("A review decision and note are required.", "INVALID_REVIEW");
    return NextResponse.json({ success: true, data: await TestDataCleanupService.reviewBatch({ batchId: (await params).id, decision: body.decision, note: body.note }) });
  } catch (error) { return cleanupErrorResponse(error); }
}
