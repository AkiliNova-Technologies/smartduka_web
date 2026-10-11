"use client";

import * as React from "react";
import { AdminMetricCard } from "@/components/admin/admin-metric-card";
import {
  buildPaymentColumns,
  buildPaymentStatCards,
  type AdminPaymentRow,
  type PaymentCounts,
} from "@/components/admin/payment-table";
import { DataTable } from "@/components/data-table";
import { DataTableStatusFilter } from "@/components/data-table-status-filter";
import { Button } from "@/components/ui/button";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { PaymentDetailsSheet } from "@/components/admin/payment-details-sheet";

const filters = [
  "ALL",
  "PENDING",
  "CONFIRMATION_DELAYED",
  "STUCK",
  "SUCCESSFUL",
  "FAILED",
  "REVERSED",
  "NEEDS_REVIEW",
] as const;
type Filter = (typeof filters)[number];
type AdminPaymentsResponse = {
  rows: AdminPaymentRow[];
  counts: PaymentCounts;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

const label = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());

export default function AdminPaymentsPage() {
  const [filter, setFilter] = React.useState<Filter>("ALL");
  const [submittedSearch, setSubmittedSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [data, setData] = React.useState<AdminPaymentsResponse>({
    rows: [],
    counts: { pending: 0, delayed: 0, stuck: 0, reversed: 0, needsReview: 0 },
    pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 },
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [reload, setReload] = React.useState(0);
  const [selected, setSelected] = React.useState<AdminPaymentRow | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          filter,
          page: String(page),
          pageSize: String(pageSize),
        });
        if (submittedSearch.trim())
          params.set("search", submittedSearch.trim());
        const response = await fetch(`/api/admin/payments?${params}`, {
          signal: controller.signal,
        });
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error || "Unable to load payment operations.");
        const next = body.data as Partial<AdminPaymentsResponse>;
        setData({
          rows: Array.isArray(next.rows) ? next.rows : [],
          counts:
            next.counts && typeof next.counts === "object"
              ? (next.counts as PaymentCounts)
              : {
                  pending: 0,
                  delayed: 0,
                  stuck: 0,
                  reversed: 0,
                  needsReview: 0,
                },
          pagination:
            next.pagination && typeof next.pagination === "object"
              ? (next.pagination as AdminPaymentsResponse["pagination"])
              : { page, pageSize, total: 0, totalPages: 0 },
        });
      } catch (cause) {
        if ((cause as Error).name !== "AbortError")
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load payment operations.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [filter, page, pageSize, submittedSearch, reload]);

  const columns = React.useMemo(() => buildPaymentColumns(setSelected), []);
  const metricCards = buildPaymentStatCards(data.counts);

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Payment operations
        </h1>
        <p className="text-sm text-muted-foreground">
          Monitor provider-authoritative customer payments, reconciliation
          health, and review-required payment events.
        </p>
      </header>
      <section
        aria-label="Payment operation metrics"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {metricCards.map((card) => (
          <AdminMetricCard
            key={card.label}
            {...card}
            value={loading ? "—" : card.value}
          />
        ))}
      </section>
      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Unable to load payment operations.{" "}
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            onClick={() => setReload((current) => current + 1)}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data.rows}
            getRowId={(row) => row.id}
            isLoading={loading}
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
              value: submittedSearch,
              onValueChange: (value) => {
                setSubmittedSearch(value);
                setPage(1);
              },
              placeholder: "Search payments...",
              ariaLabel: "Search payments",
            }}
            toolbarContent={
              <div className="flex items-center gap-2">
                <DataTableStatusFilter value={filter} onValueChange={(value) => { setFilter(value as Filter); setPage(1); }} options={filters.map((item) => ({ value: item, label: item === "ALL" ? "All statuses" : label(item) }))} />
                {filter !== "ALL" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setFilter("ALL");
                      setPage(1);
                    }}>
                    Reset
                  </Button>
                )}
              </div>
            }
            emptyStateContent={
              <p className="py-5 text-sm text-muted-foreground">
                {submittedSearch && filter !== "ALL"
                  ? "No payments match the current search and filters."
                  : submittedSearch
                    ? "No payments match your search."
                    : filter !== "ALL"
                      ? "No payments match the current filters."
                  : "No payment activity yet."}
              </p>
            }
          />
          <PaginationControls
            pageIndex={Math.max(0, data.pagination.page - 1)}
            pageSize={data.pagination.pageSize}
            pageCount={data.pagination.totalPages}
            total={data.pagination.total}
            pageSizeOptions={[10, 25, 50, 100]}
            onPageChange={(pageIndex) => setPage(pageIndex + 1)}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(1);
            }}
          />
        </>
      )}
      <PaymentDetailsSheet
        payment={selected}
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  );
}
