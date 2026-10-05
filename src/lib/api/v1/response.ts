import { ZodError } from "zod";
import { AccountInactiveError, AuthenticationRequiredError } from "@/lib/auth/session";
import { VendorAuthorizationError } from "@/lib/auth/vendor-context";

export const V1_ERROR_CODES = [
  "UNAUTHENTICATED", "FORBIDDEN", "NOT_FOUND", "VALIDATION_ERROR", "RATE_LIMITED",
  "CONFLICT", "IDEMPOTENCY_CONFLICT", "INSUFFICIENT_STOCK", "PRODUCT_UNAVAILABLE",
  "INVALID_VARIANT", "PAYMENT_FAILED", "ORDER_NOT_FOUND", "VENDOR_ACCESS_DENIED",
] as const;
export type V1ErrorCode = (typeof V1_ERROR_CODES)[number] | string;

export function v1Data<T>(data: T, status = 200, headers?: HeadersInit) {
  return Response.json({ data }, { status, headers });
}

export function v1List<T>(data: T[]) {
  return v1Data(data, 200, { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" });
}

export function v1Paginated<T>(data: T[], input: { page: number; pageSize: number; total: number }) {
  return Response.json({ data, meta: { ...input, hasMore: input.page * input.pageSize < input.total } });
}

export function v1Error(code: V1ErrorCode, message: string, status: number, fields?: Record<string, string>) {
  return Response.json({ error: { code, message, ...(fields ? { fields } : {}) } }, { status });
}

export function v1Exception(error: unknown) {
  if (error instanceof ZodError) return v1Error("VALIDATION_ERROR", "Invalid request.", 400, Object.fromEntries(error.issues.map((issue) => [issue.path.join(".") || "request", issue.message])));
  if (error instanceof AuthenticationRequiredError) return v1Error("UNAUTHENTICATED", "Authentication is required.", 401);
  if (error instanceof AccountInactiveError) return v1Error("FORBIDDEN", "This account is inactive.", 403);
  if (error instanceof VendorAuthorizationError) return v1Error("VENDOR_ACCESS_DENIED", "Vendor access is required.", 403);
  const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : "INTERNAL_ERROR";
  const status = code === "NOT_FOUND" || code === "ORDER_NOT_FOUND" ? 404 : code === "IDEMPOTENCY_CONFLICT" || code === "DUPLICATE" ? 409 : code === "FORBIDDEN" || code === "VENDOR_ACCESS_DENIED" ? 403 : 400;
  const message = error instanceof Error && !/(prisma|sql|database)/i.test(error.message) ? error.message : "Unable to complete this request.";
  return v1Error(code === "DUPLICATE" ? "CONFLICT" : code, message, status);
}

export function parsePage(params: URLSearchParams) {
  const number = (name: string, fallback: number) => {
    const value = Number(params.get(name) ?? fallback);
    return Number.isInteger(value) && value > 0 ? value : fallback;
  };
  return { page: number("page", 1), pageSize: Math.min(number("pageSize", 20), 50) };
}
