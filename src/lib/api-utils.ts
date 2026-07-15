// ==========================================
// STANDARDIZED API UTILITIES
// ==========================================

/**
 * Standard API success response
 */
export function successResponse<T>(data: T, status = 200) {
  return Response.json({ success: true, data }, { status });
}

/**
 * Standard API error response
 */
export function errorResponse(
  error: string,
  status = 500,
  code?: string
) {
  return Response.json(
    { success: false, error, ...(code && { code }) },
    { status }
  );
}

/**
 * Standard paginated response
 */
export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
) {
  return Response.json(
    {
      success: true,
      data: { items, total, page, limit },
    },
    { status: 200 }
  );
}

/**
 * Extracts human-readable error message from any thrown value
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unexpected error occurred.";
}

/**
 * Standard action return type for server actions
 */
export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Wraps a service call with standardized error handling for server actions
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context: string
): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error: unknown) {
    console.error(`[${context}]`, error);
    return { success: false, error: getErrorMessage(error) };
  }
}

/**
 * Validates that required fields are present in an object.
 * Works with any object type - no index signature required.
 */
export function validateRequiredFields<T extends object>(
  input: T,
  requiredFields: (keyof T)[]
): string | null {
  for (const field of requiredFields) {
    const value = (input as Record<keyof T, unknown>)[field];
    if (value === undefined || value === null || value === "") {
      return `Missing required field: ${String(field)}`;
    }
  }
  return null;
}

/**
 * Type-safe serialization helper - converts Prisma Decimal to number
 */
export function serializeDecimal<T extends Record<string, unknown>>(
  obj: T,
  ...fields: (keyof T)[]
): T {
  const result = { ...obj };
  for (const field of fields) {
    if (result[field] != null) {
      (result as Record<string, unknown>)[field as string] = Number(result[field]);
    }
  }
  return result;
}