"use client";

import * as React from "react";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Eye,
  RotateCcw,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DashboardMetricCard } from "@/components/dashboard-metric-card";
import { DataTable } from "@/components/data-table";
import { DataTableRowActions } from "@/components/data-table-row-actions";
import { DataTableStatusFilter } from "@/components/data-table-status-filter";
import { StatusBadge } from "@/components/marketplace/status-badge";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type {
  VendorTransactionFilter,
  VendorTransactionRow,
} from "@/services/vendor-transactions";

const filters: VendorTransactionFilter[] = [
  "ALL",
  "PENDING",
  "SUCCESSFUL",
  "FAILED",
  "REVERSED",
  "NEEDS_REVIEW",
];
const label = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());
const money = (amount: string, currency: string) =>
  new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount));
const date = (value: string | Date | null) =>
  value
    ? new Intl.DateTimeFormat("en-UG", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "—";
type Result = {
  rows: VendorTransactionRow[];
  counts: {
    successful: number;
    pending: number;
    reversed: number;
    needsReview: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

function Status({ transaction }: { transaction: VendorTransactionRow }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <StatusBadge status={transaction.status} />
      {transaction.paymentHealth && transaction.paymentHealth !== "HEALTHY" && (
        <span className="text-[11px] text-muted-foreground">
          {label(transaction.paymentHealth)}
        </span>
      )}
    </div>
  );
}

export default function VendorTransactionsClient({
  initialData,
  initialFilter,
  initialSearch,
}: {
  initialData: Result;
  initialFilter: VendorTransactionFilter;
  initialSearch: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [selected, setSelected] = React.useState<VendorTransactionRow | null>(
    null,
  );
  const [loadingDetail, setLoadingDetail] = React.useState(false);
  const updateQuery = React.useCallback(
    (next: Record<string, string | null>) => {
      const query = new URLSearchParams(params.toString());
      Object.entries(next).forEach(([key, value]) =>
        value ? query.set(key, value) : query.delete(key),
      );
      router.replace(`${pathname}?${query}`);
    },
    [params, pathname, router],
  );
  const view = React.useCallback(async (row: VendorTransactionRow) => {
    setLoadingDetail(true);
    try {
      const response = await fetch(`/api/v1/vendor/transactions/${row.id}`, {
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) throw new Error("Unable to load transaction details.");
      setSelected(body.data as VendorTransactionRow);
    } finally {
      setLoadingDetail(false);
    }
  }, []);
  const columns = React.useMemo<ColumnDef<VendorTransactionRow>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Transaction",
        cell: ({ row }) => (
          <div className="min-w-24">
            <p className="font-mono text-xs font-semibold text-primary">
              {row.original.id.slice(0, 8)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {label(row.original.provider)}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "orderNumber",
        header: "Order",
        cell: ({ row }) => (
          <div className="min-w-0 max-w-44">
            <p className="truncate font-medium">{row.original.orderNumber}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {row.original.subOrderNumber}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-medium tabular-nums">
            {money(row.original.amount, row.original.currency)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <Status transaction={row.original} />,
      },
      {
        accessorKey: "updatedAt",
        header: () => <span className="hidden lg:inline">Activity</span>,
        cell: ({ row }) => (
          <div className="hidden min-w-28 text-[11px] lg:block">
            <p>Updated {date(row.original.updatedAt)}</p>
            {row.original.reconciliationAttempts > 0 && (
              <p className="mt-1 text-muted-foreground">
                {row.original.reconciliationAttempts} check
                {row.original.reconciliationAttempts === 1 ? "" : "s"}
              </p>
            )}
          </div>
        ),
      },
      {
        id: "action",
        header: "View",
        cell: ({ row }) => <DataTableRowActions actions={[{ id: "view", label: `View transaction ${row.original.id.slice(0, 8)}`, icon: Eye, onSelect: () => void view(row.original) }]} />,
      },
    ],
    [view],
  );
  const hasFilters = initialSearch || initialFilter !== "ALL";
  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <p className="text-sm text-muted-foreground">
          Track customer payment activity for your orders, including pending,
          successful, failed, and reversed payments.
        </p>
      </header>
      <section
        aria-label="Transaction metrics"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardMetricCard
          label="Successful"
          value={initialData.counts.successful}
          description="Provider-confirmed payments"
          icon={CheckCircle2}
          tone="success"
        />
        <DashboardMetricCard
          label="Pending"
          value={initialData.counts.pending}
          description="Awaiting confirmation"
          icon={Clock3}
          tone="warning"
        />
        <DashboardMetricCard
          label="Reversed"
          value={initialData.counts.reversed}
          description="Require order review"
          icon={RotateCcw}
          tone="danger"
        />
        <DashboardMetricCard
          label="Needs review"
          value={initialData.counts.needsReview}
          description="Payment exceptions"
          icon={AlertTriangle}
          tone="danger"
        />
      </section>
      <DataTableStatusFilter
        value={initialFilter}
        onValueChange={(filter) => updateQuery({ filter: filter === "ALL" ? null : filter, page: "1" })}
        options={filters.map((filter) => ({ value: filter, label: filter === "ALL" ? "All statuses" : label(filter) }))}
      />
      <DataTable
        columns={columns}
        data={initialData.rows}
        getRowId={(row) => row.id}
        features={{
          pagination: false,
          search: true,
          columnVisibility: false,
          sorting: false,
          filtering: false,
          rowSelection: false,
          footer: false,
        }}
        search={{
          value: initialSearch,
          onValueChange: (search) =>
            updateQuery({ search: search || null, page: "1" }),
          placeholder: "Search transactions...",
          ariaLabel: "Search transactions",
        }}
        emptyStateContent={
          <p className="py-5 text-sm text-muted-foreground">
            {hasFilters
              ? "No transactions match your search and filters."
              : "No payment transactions yet. Customer payment activity for your orders will appear here."}
          </p>
        }
      />
      <PaginationControls
        pageIndex={Math.max(0, initialData.pagination.page - 1)}
        pageSize={initialData.pagination.pageSize}
        pageCount={initialData.pagination.totalPages}
        total={initialData.pagination.total}
        pageSizeOptions={[10, 25, 50, 100]}
        onPageChange={(index) => updateQuery({ page: String(index + 1) })}
        onPageSizeChange={(pageSize) =>
          updateQuery({ pageSize: String(pageSize), page: "1" })
        }
      />
      <VendorTransactionDetailsSheet
        transaction={selected}
        loading={loadingDetail}
        open={!!selected || loadingDetail}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  );
}

function VendorTransactionDetailsSheet({
  transaction,
  loading,
  open,
  onOpenChange,
}: {
  transaction: VendorTransactionRow | null;
  loading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pendingWarning = transaction?.status === "PENDING" &&
    ["CONFIRMATION_DELAYED", "STUCK"].includes(transaction.paymentHealth ?? "");
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Transaction details</SheetTitle>
          <SheetDescription>
            {transaction ? transaction.id.slice(0, 8) : "Loading transaction…"}
          </SheetDescription>
        </SheetHeader>
        {loading && !transaction ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Loading transaction…
          </p>
        ) : transaction && (
          <div className="mt-6 space-y-6 text-sm">
            <div className="flex flex-wrap gap-2">
              <Status transaction={transaction} />
            </div>
            <section>
              <h2 className="font-semibold">Payment summary</h2>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <Detail
                  label="Amount"
                  value={money(transaction.amount, transaction.currency)}
                />
                <Detail label="Provider" value={label(transaction.provider)} />
                <Detail label="Order" value={transaction.orderNumber} />
                <Detail
                  label="Seller order"
                  value={transaction.subOrderNumber}
                />
                <Detail
                  label="Payment status"
                  value={label(transaction.status)}
                />
                <Detail
                  label="Payment health"
                  value={
                    transaction.paymentHealth
                      ? label(transaction.paymentHealth)
                      : "Healthy"
                  }
                />
              </div>
            </section>
            <section>
              <h2 className="font-semibold">Provider information</h2>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <Detail label="Provider" value={label(transaction.provider)} />
                <Detail
                  label="Masked reference"
                  value={transaction.maskedProviderReference ?? "—"}
                />
              </div>
            </section>
            <section>
              <h2 className="font-semibold">Reconciliation summary</h2>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <Detail
                  label="Last checked"
                  value={date(transaction.lastReconciliationAt)}
                />
                <Detail
                  label="Next check"
                  value={date(transaction.nextReconcileAt)}
                />
                <Detail
                  label="Confirmation attempts"
                  value={String(transaction.reconciliationAttempts)}
                />
              </div>
            </section>
            <section>
              <h2 className="font-semibold">Fulfillment</h2>
              <p className="mt-2">{label(transaction.fulfillmentStatus)}</p>
            </section>
            {transaction.status === "REVERSED" && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-800 dark:text-rose-200">
                <p className="font-semibold">
                  Payment reversed — review required
                </p>
                {[
                  "PROCESSING",
                  "READY_FOR_PICKUP",
                  "SHIPPED",
                  "DELIVERED",
                ].includes(transaction.fulfillmentStatus) && (
                  <p className="mt-1">
                    This payment was reversed after fulfillment began. Review
                    the order before taking further action.
                  </p>
                )}
              </div>
            )}
            {pendingWarning && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-200">
                Payment confirmation is taking longer than expected. Do not
                assume payment is complete.
              </div>
            )}
            <Button asChild variant="outline">
              <Link
                href={`/vendor/orders?search=${encodeURIComponent(transaction.subOrderNumber)}`}>
                View order
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              This is a read-only payment activity view. Payment status and
              provider checks are managed by SmartDuka.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
