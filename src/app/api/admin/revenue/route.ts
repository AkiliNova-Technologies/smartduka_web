import { NextRequest } from "next/server";
import { successResponse, errorResponse, getErrorMessage } from "@/lib/api-utils";
import { AdminPlatformRevenueService, type RevenueFilter } from "@/services/admin-platform-revenue";
const filters = new Set<RevenueFilter>(["ALL", "PENDING", "PAID", "FAILED", "REVERSED", "NEEDS_REVIEW"]);
export async function GET(request: NextRequest) { try { const p = request.nextUrl.searchParams, filter = p.get("filter") ?? "ALL"; if (!filters.has(filter as RevenueFilter)) return errorResponse("Invalid revenue filter.", 400); return successResponse(await AdminPlatformRevenueService.list({ filter: filter as RevenueFilter, type: p.get("type") ?? "ALL", search: p.get("search") ?? undefined, page: Number(p.get("page") ?? 1), pageSize: Number(p.get("pageSize") ?? 25) })); } catch (error) { return errorResponse(getErrorMessage(error), 403); } }
