import { Suspense } from "react";
import { connection } from "next/server";
import { requireVendorContext } from "@/lib/auth/vendor-context";
import { getVendorOrders } from "@/services/vendor-orders";
import { Skeleton } from "@/components/ui/skeleton";
import VendorOrdersClient from "./vendor-orders-client";

type OrderSearchParams = Promise<{
  page?: string;
  pageSize?: string;
  search?: string;
  status?: string;
}>;

export default function VendorOrdersPage({
  searchParams,
}: {
  searchParams: OrderSearchParams;
}) {
  return (
    <Suspense fallback={<OrdersFallback />}>
      <VendorOrdersData searchParams={searchParams} />
    </Suspense>
  );
}

async function VendorOrdersData({
  searchParams,
}: {
  searchParams: OrderSearchParams;
}) {
  // JWT verification consults the current time. This authenticated route must
  // enter a request-time boundary before any session resolution occurs.
  await connection();
  const [context, params] = await Promise.all([
    requireVendorContext("vendor:view_orders"),
    searchParams,
  ]);
  const initialData = await getVendorOrders(context.vendorId, {
    page: Number(params.page) || 1,
    pageSize: Number(params.pageSize) || 10,
    search: params.search,
    status: params.status,
  });

  return (
    <VendorOrdersClient
      key={`${params.page ?? "1"}:${params.pageSize ?? "10"}:${params.status ?? "ALL"}:${params.search ?? ""}`}
      initialData={initialData}
    />
  );
}

function OrdersFallback() {
  return (
    <div className="space-y-6" aria-label="Loading orders">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}
