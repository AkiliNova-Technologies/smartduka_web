import { NextResponse } from "next/server";
import { AuthenticationRequiredError } from "@/lib/auth/session";
import { AdminAuthorizationError } from "@/lib/auth/admin-context";
import { CsrfValidationError } from "@/lib/auth/csrf";
import { TestDataCleanupError } from "@/services/test-data-cleanup";

export function cleanupErrorResponse(error: unknown) {
  const status = error instanceof TestDataCleanupError ? error.status
    : error instanceof AuthenticationRequiredError ? 401
      : error instanceof AdminAuthorizationError || error instanceof CsrfValidationError ? 403 : 500;
  const code = error instanceof TestDataCleanupError ? error.code : status === 401 ? "AUTHENTICATION_REQUIRED" : status === 403 ? "FORBIDDEN" : "INTERNAL_ERROR";
  if (status === 500) console.error("[test-data-cleanup]", error);
  return NextResponse.json({ success: false, error: status === 500 ? "Test-data cleanup request failed." : error instanceof Error ? error.message : "Request failed.", code }, { status });
}
