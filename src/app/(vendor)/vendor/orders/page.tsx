import { requireVendorContext } from "@/lib/auth/vendor-context";
import { getVendorOrders } from "@/services/vendor-orders";
import VendorOrdersClient from "./vendor-orders-client";

export default async function VendorOrdersPage({ searchParams }: { searchParams: Promise<{ page?: string; pageSize?: string; search?: string; status?: string }> }) {
  const [context, params] = await Promise.all([requireVendorContext("vendor:view_orders"), searchParams]);
  const initialData = await getVendorOrders(context.vendorId, { page: Number(params.page) || 1, pageSize: Number(params.pageSize) || 10, search: params.search, status: params.status });
  return <VendorOrdersClient key={`${params.page ?? "1"}:${params.pageSize ?? "10"}:${params.status ?? "ALL"}:${params.search ?? ""}`} initialData={initialData} />;
}
