import { NextRequest } from "next/server";
import { requireVendorContext } from "@/lib/auth/vendor-context";
import { v1Data, v1Error, v1Exception } from "@/lib/api/v1/response";
import { VendorTransactionsService } from "@/services/vendor-transactions";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireVendorContext("vendor:view_ledger");
    const transaction = await VendorTransactionsService.detail(context.vendorId, (await params).id);
    return transaction ? v1Data(transaction, 200, { "Cache-Control": "private, no-store" }) : v1Error("NOT_FOUND", "Transaction not found.", 404);
  } catch (error) { return v1Exception(error); }
}
