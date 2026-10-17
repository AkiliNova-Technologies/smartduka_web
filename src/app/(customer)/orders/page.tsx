import { Suspense } from "react";
import { OrdersClient, OrdersFallback } from "./OrdersClient";

type OrdersPageProps = { searchParams: Promise<{ page?: string | string[]; filter?: string | string[] }> };

export default function OrdersPage({ searchParams }: OrdersPageProps) {
  return <Suspense fallback={<OrdersFallback />}><OrdersRuntime searchParams={searchParams} /></Suspense>;
}

async function OrdersRuntime({ searchParams }: OrdersPageProps) {
  const params = await searchParams;
  const pageValue = Array.isArray(params.page) ? params.page[0] : params.page;
  const filterValue = Array.isArray(params.filter) ? params.filter[0] : params.filter;
  const page = pageValue && /^\d+$/.test(pageValue) ? Math.max(1, Number(pageValue)) : 1;
  const filter = ["awaiting-payment", "in-progress", "completed", "cancelled"].includes(filterValue ?? "") ? filterValue! : "all";
  return <OrdersClient page={page} filter={filter} />;
}
