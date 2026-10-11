import { NextResponse } from "next/server";
import { isExternalCleanupExecutionEnabled, TestDataStorageCleanupService } from "@/services/test-data-storage-cleanup";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isExternalCleanupExecutionEnabled()) {
    return NextResponse.json({ error: "Automated external cleanup is disabled." }, { status: 503 });
  }
  return NextResponse.json({ success: true, data: await TestDataStorageCleanupService.processPending() });
}
