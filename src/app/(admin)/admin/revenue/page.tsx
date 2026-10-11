"use client";
import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import {
  CircleAlert,
  CircleDollarSign,
  Clock3,
  Eye,
  Megaphone,
} from "lucide-react";
import { AdminMetricCard } from "@/components/admin/admin-metric-card";
import { DataTable } from "@/components/data-table";
import { DataTableStatusFilter } from "@/components/data-table-status-filter";
import { DataTableRowActions } from "@/components/data-table-row-actions";
import { Button } from "@/components/ui/button";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Payment = {
  status: string;
  provider: string;
  reference: string | null;
  lastChecked?: string | null;
} | null;
type Row = {
  id: string;
  vendor: string;
  type: string;
  status: string;
  serviceValue: string;
  creditApplied: string;
  cashAmount: string;
  createdAt: string;
  updatedAt: string;
  campaign: { id: string; productName: string | null; status: string } | null;
  payment: Payment;
};
type Data = {
  rows: Row[];
  counts: {
    cashRevenue: number;
    pending: number;
    promotionRevenue: number;
    needsReview: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
const statuses = [
  ["ALL", "All"],
  ["PENDING", "Pending"],
  ["PAID", "Paid"],
  ["FAILED", "Failed"],
  ["REVERSED", "Reversed"],
  ["NEEDS_REVIEW", "Needs review"],
] as const;
const types = [
  ["ALL", "All services"],
  ["PRODUCT_PROMOTION", "Product promotion"],
  ["SHOP_PROMOTION", "Shop promotion"],
  ["SUBSCRIPTION", "Subscription"],
] as const;
const money = (v: string | number) =>
  `UGX ${Number(v).toLocaleString("en-UG")}`;
const label = (v: string) =>
  v
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (x) => x.toUpperCase());
const date = (v: string | null | undefined) =>
  v
    ? new Intl.DateTimeFormat("en-UG", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(v))
    : "—";
const paymentLabel = (r: Row) =>
  !r.payment
    ? r.status === "AWAITING_PAYMENT"
      ? "Awaiting payment"
      : label(r.status)
    : ({
        PENDING: "Confirming",
        SUCCESSFUL: "Paid",
        FAILED: "Failed",
        REVERSED: "Reversed",
      }[r.payment.status] ?? label(r.payment.status));

export default function RevenuePage() {
  const [data, setData] = React.useState<Data>({
      rows: [],
      counts: {
        cashRevenue: 0,
        pending: 0,
        promotionRevenue: 0,
        needsReview: 0,
      },
      pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 },
    }),
    [status, setStatus] = React.useState("ALL"),
    [type, setType] = React.useState("ALL"),
    [search, setSearch] = React.useState(""),
    [page, setPage] = React.useState(1),
    [pageSize, setPageSize] = React.useState(25),
    [loading, setLoading] = React.useState(true),
    [selected, setSelected] = React.useState<Row | null>(null);
  const load = React.useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        filter: status,
        type,
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search) q.set("search", search);
      const r = await fetch(`/api/admin/revenue?${q}`, {
          cache: "no-store",
          signal,
        }),
        b = await r.json();
      if (r.ok && b.data) setData(b.data);
    } catch (error) {
      if (!signal.aborted) throw error;
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [status, type, page, pageSize, search]);
  React.useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void load(controller.signal);
    });

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [load]);
  const cols = React.useMemo<ColumnDef<Row>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Revenue order",
        cell: ({ row }) => (
          <div className="min-w-24">
            <p className="font-mono text-xs font-semibold text-primary">
              {row.original.id.slice(0, 8)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {date(row.original.createdAt)}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "vendor",
        header: "Vendor",
        cell: ({ row }) => (
          <p className="max-w-36 truncate font-medium">{row.original.vendor}</p>
        ),
      },
      {
        accessorKey: "type",
        header: "Service",
        cell: ({ row }) => (
          <p className="min-w-28">{label(row.original.type)}</p>
        ),
      },
      {
        accessorKey: "serviceValue",
        header: "Value",
        cell: ({ row }) => (
          <div>
            <p>{money(row.original.serviceValue)}</p>
            {Number(row.original.creditApplied) > 0 && (
              <p className="text-[11px] text-muted-foreground">
                {money(row.original.creditApplied)} credit
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: "cashAmount",
        header: "Cash",
        cell: ({ row }) => <span>{money(row.original.cashAmount)}</span>,
      },
      {
        id: "payment",
        header: () => <span className="hidden lg:inline">Payment</span>,
        cell: ({ row }) => (
          <span className="hidden lg:inline">{paymentLabel(row.original)}</span>
        ),
      },
      {
        accessorKey: "updatedAt",
        header: () => <span className="hidden xl:inline">Activity</span>,
        cell: ({ row }) => (
          <span className="hidden xl:inline whitespace-nowrap">
            {date(row.original.updatedAt)}
          </span>
        ),
      },
      {
        id: "action",
        header: "Action",
        cell: ({ row }) => <DataTableRowActions actions={[{ id: "view", label: "View revenue record", icon: Eye, onSelect: () => setSelected(row.original) }]} />,
      },
    ],
    [],
  );
  const reset = (change: () => void) => {
    change();
    setPage(1);
  };
  return (
    <div className="min-w-0 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Platform Revenue
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track SmartDuka subscription and promotion revenue, platform payments,
          and items requiring review.
        </p>
      </header>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminMetricCard
          label="Cash revenue"
          value={money(data.counts.cashRevenue)}
          helper="Cash collected only"
          icon={CircleDollarSign}
        />
        <AdminMetricCard
          label="Pending payments"
          value={data.counts.pending}
          icon={Clock3}
          tone="warning"
        />
        <AdminMetricCard
          label="Promotion revenue"
          value={money(data.counts.promotionRevenue)}
          helper="Cash collected from promotions"
          icon={Megaphone}
        />
        <AdminMetricCard
          label="Needs review"
          value={data.counts.needsReview}
          icon={CircleAlert}
          tone="danger"
        />
      </section>
      <DataTable
        columns={cols}
        data={data.rows}
        getRowId={(r) => r.id}
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
          value: search,
          onValueChange: (value) => reset(() => setSearch(value)),
          placeholder: "Search revenue orders",
          ariaLabel: "Search revenue orders",
        }}
        toolbarContent={
          <div className="flex flex-wrap items-center gap-2">
            <DataTableStatusFilter value={status} onValueChange={(value) => reset(() => setStatus(value))} options={statuses.map(([value, label]) => ({ value, label }))} />
            <Select
              value={type}
              onValueChange={(value) => reset(() => setType(value))}>
              <SelectTrigger className="h-9 w-44 rounded-xl text-xs">
                <SelectValue placeholder="All services" />
              </SelectTrigger>
              <SelectContent className="p-1">
                {types.map(([value, text]) => (
                  <SelectItem key={value} value={value} className="text-xs">
                    {text}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(status !== "ALL" || type !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  reset(() => {
                    setStatus("ALL");
                    setType("ALL");
                  });
                }}>
                Reset
              </Button>
            )}
          </div>
        }
        emptyStateContent={
          <span>No revenue orders match your search and filters.</span>
        }
      />
      <PaginationControls
        pageIndex={Math.max(0, data.pagination.page - 1)}
        pageSize={data.pagination.pageSize}
        pageCount={data.pagination.totalPages}
        total={data.pagination.total}
        pageSizeOptions={[10, 25, 50, 100]}
        onPageChange={(index) => setPage(index + 1)}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
      <RevenueDetailsSheet
        row={selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  );
}
function RevenueDetailsSheet({
  row,
  onOpenChange,
}: {
  row: Row | null;
  onOpenChange: (open: boolean) => void;
}) {
  const warning = !row
    ? null
    : row.payment?.status === "REVERSED"
      ? "Payment reversed"
      : row.status === "REVIEW_REQUIRED"
        ? "This revenue order requires review."
        : null;
  const detail = (title: string, items: [string, string][]) => (
    <section>
      <h3 className="font-medium">{title}</h3>
      <dl className="mt-3 space-y-3">
        {items.map(([term, value]) => (
          <div
            key={term}
            className="flex items-start justify-between gap-4 text-sm">
            <dt className="text-muted-foreground">{term}</dt>
            <dd className="text-right font-medium break-all">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
  const resource = !row
    ? "—"
    : row.type === "PRODUCT_PROMOTION"
      ? `Product promotion campaign${row.campaign?.productName ? `: ${row.campaign.productName}` : ""}`
      : row.type === "SHOP_PROMOTION"
        ? "Shop promotion campaign"
        : "Subscription";
  return (
    <Sheet open={!!row} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Revenue order details</SheetTitle>
          <SheetDescription>{row?.id.slice(0, 8)}</SheetDescription>
        </SheetHeader>
        {row && (
          <div className="space-y-6 px-4 pb-6">
            {warning && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-900 dark:text-amber-100">
                {warning}
              </div>
            )}
            {detail("Summary", [
              ["Revenue order", row.id],
              ["Vendor", row.vendor],
              ["Shop", row.vendor],
              ["Service type", label(row.type)],
              ["Payment status", paymentLabel(row)],
            ])}
            {detail("Commercial breakdown", [
              ["Service value", money(row.serviceValue)],
              ["Promotional credit applied", money(row.creditApplied)],
              ["Cash collected", money(row.cashAmount)],
            ])}
            {detail("Related resource", [["Resource", resource]])}
            {detail("Payment details", [
              ["Provider", row.payment ? label(row.payment.provider) : "—"],
              ["Payment status", paymentLabel(row)],
              ["Masked provider reference", row.payment?.reference ?? "—"],
              ["Last reconciliation/check", date(row.payment?.lastChecked)],
              ["Created", date(row.createdAt)],
              ["Updated", date(row.updatedAt)],
            ])}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
