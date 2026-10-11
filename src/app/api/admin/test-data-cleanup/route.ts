import { NextResponse } from "next/server";
import { cleanupErrorResponse } from "@/lib/test-data-cleanup-http";
import { TestDataCleanupService } from "@/services/test-data-cleanup";
import { connection } from "next/server";

export async function GET() {
  await connection();
  try {
    return NextResponse.json({ success: true, data: await TestDataCleanupService.overview() });
  } catch (error) { return cleanupErrorResponse(error); }
}
