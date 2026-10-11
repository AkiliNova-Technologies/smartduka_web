import { Suspense } from "react";
import { connection } from "next/server";
import { requireVendorContext } from "@/lib/auth/vendor-context";
import {
  VendorTransactionsService,
  vendorTransactionFilters,
  type VendorTransactionFilter,
} from "@/services/vendor-transactions";
import VendorTransactionsClient from "./vendor-transactions-client";
import { Skeleton } from "@/components/ui/skeleton";

type TransactionSearchParams = Promise<{
  page?: string;
  pageSize?: string;
  search?: string;
  filter?: string;
}>;

export default async function VendorTransactionsPage({
  searchParams,
}: {
  searchParams: TransactionSearchParams;
}) {
  return (
    <Suspense fallback={<TransactionsFallback />}>
      <VendorTransactionsData searchParams={searchParams} />
    </Suspense>
  );
}

async function VendorTransactionsData({
  searchParams,
}: {
  searchParams: TransactionSearchParams;
}) {
  // Session verification is request-bound and must not be prerendered.
  await connection();
  const [context, params] = await Promise.all([
    requireVendorContext("vendor:view_ledger"),
    searchParams,
  ]);
  const filter = vendorTransactionFilters.includes(
    params.filter as VendorTransactionFilter,
  )
    ? (params.filter as VendorTransactionFilter)
    : "ALL";
  const initialData = await VendorTransactionsService.list(context.vendorId, {
    filter,
    page: Number(params.page) || 1,
    pageSize: Number(params.pageSize) || 25,
    search: params.search,
  });
  return (
    <VendorTransactionsClient
      initialData={initialData}
      initialFilter={filter}
      initialSearch={params.search ?? ""}
    />
  );
}

function TransactionsFallback() {
  return (
    <div className="space-y-6" aria-label="Loading transactions">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
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
