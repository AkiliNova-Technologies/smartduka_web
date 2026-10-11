import { errorResponse, getErrorMessage, successResponse } from "@/lib/api-utils";
import { AdminPaymentOperationsService, type PaymentQueueFilter } from "@/services/admin-payment-operations";

const filters = new Set<PaymentQueueFilter>(["ALL", "PENDING", "CONFIRMATION_DELAYED", "STUCK", "SUCCESSFUL", "FAILED", "REVERSED", "NEEDS_REVIEW"]);

/** Stable, page-facing contract for the admin payment queue. */
export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams;
    const filter = query.get("filter") ?? "ALL";
    if (!filters.has(filter as PaymentQueueFilter)) return errorResponse("Invalid payment filter.", 400);
    const page = Number(query.get("page") ?? "1");
    const pageSize = Number(query.get("pageSize") ?? "25");
    if (!Number.isFinite(page) || !Number.isFinite(pageSize)) return errorResponse("Invalid pagination.", 400);
    const [result, counts] = await Promise.all([
      AdminPaymentOperationsService.list({ filter: filter as PaymentQueueFilter, page, pageSize, search: query.get("search") ?? undefined }),
      AdminPaymentOperationsService.diagnostics(),
    ]);
    return successResponse({
      rows: result.items,
      counts: { pending: counts.pending, delayed: counts.confirmationDelayed, stuck: counts.stuck, reversed: counts.reversed, needsReview: counts.needsReview },
      pagination: { page: result.page, pageSize: result.pageSize, total: result.total, totalPages: Math.ceil(result.total / result.pageSize) },
    });
  } catch (error) {
    return errorResponse(getErrorMessage(error), 403);
  }
}
