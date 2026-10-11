import { NextRequest } from "next/server";
import { requireVendorContext } from "@/lib/auth/vendor-context";
import { parsePage, v1Data, v1Exception } from "@/lib/api/v1/response";
import { VendorTransactionsService, vendorTransactionFilters, type VendorTransactionFilter } from "@/services/vendor-transactions";

export async function GET(request: NextRequest) {
  try {
    const filter = request.nextUrl.searchParams.get("filter") ?? "ALL";
    if (!vendorTransactionFilters.includes(filter as VendorTransactionFilter)) throw new Error("Invalid transaction filter.");
    const context = await requireVendorContext("vendor:view_ledger");
    const { page, pageSize } = parsePage(request.nextUrl.searchParams);
    return v1Data(await VendorTransactionsService.list(context.vendorId, {
      filter: filter as VendorTransactionFilter, page, pageSize,
      search: request.nextUrl.searchParams.get("search") ?? request.nextUrl.searchParams.get("q") ?? undefined,
    }), 200, { "Cache-Control": "private, no-store" });
  } catch (error) { return v1Exception(error); }
}
