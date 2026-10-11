import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertCircle,
  CircleAlert,
  Clock3,
  Eye,
  RotateCcw,
  TimerReset,
} from "lucide-react";
import { StatusBadge } from "@/components/marketplace/status-badge";
import { DataTableRowActions } from "@/components/data-table-row-actions";

export type AdminPaymentRow = {
  id: string;
  provider: string;
  amount: string;
  currency: string;
  status: string;
  paymentHealth: string | null;
  needsReview: boolean;
  providerReference: string | null;
  reconcileAttempts: number;
  ageMinutes: number;
  createdAt: string;
  updatedAt: string;
  lastReconciledAt: string | null;
  nextReconcileAt: string | null;
  safeErrorSummary?: string | null;
  order: { orderNumber: string };
  subOrder: { subOrderNumber: string; status: string };
  vendor: { storeName: string };
};
export type PaymentCounts = {
  pending: number;
  delayed: number;
  stuck: number;
  reversed: number;
  needsReview: number;
};

const label = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());
const money = (amount: string, currency: string) =>
  `${currency} ${Number(amount).toLocaleString("en-UG", { maximumFractionDigits: 2 })}`;
const statusTone = (status: string) =>
  status === "SUCCESSFUL"
    ? "success"
    : ["FAILED", "REVERSED"].includes(status)
      ? "danger"
      : status === "PENDING"
        ? "warning"
        : "neutral";

export function buildPaymentColumns(
  onView: (payment: AdminPaymentRow) => void,
): ColumnDef<AdminPaymentRow, unknown>[] {
  return [
    {
      accessorKey: "id",
      header: "Payment",
      cell: ({ row }) => (
        <div className="min-w-24">
          <p className="font-mono text-xs font-semibold text-primary">
            {row.original.id.slice(0, 8)}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "order",
      header: "Order / vendor",
      cell: ({ row }) => (
        <div className="min-w-0 max-w-56">
          <p className="truncate text-sm font-medium">
            {row.original.order.orderNumber}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {row.original.vendor.storeName}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm font-medium tabular-nums">
          {money(row.original.amount, row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: "provider",
      header: "Provider",
      cell: ({ row }) => (
         <div className="">
            <StatusBadge tone="info">
              {label(row.original.provider)}
            </StatusBadge>
          </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <div className="flex min-w-32 flex-col items-start gap-1">
          <StatusBadge tone={statusTone(row.original.status)}>
            {label(row.original.status)}
          </StatusBadge>
        </div>
      ),
    },
    {
      accessorKey: "reconcileAttempts",
      header: () => <span className="hidden lg:inline">Activity</span>,
      cell: ({ row }) => (
        <div className="hidden min-w-24 text-xs lg:block">
          <p>
            {row.original.reconcileAttempts > 0
              ? `${row.original.reconcileAttempts} attempt${row.original.reconcileAttempts === 1 ? "" : "s"}`
              : "No retries"}
          </p>
          <p className="mt-1 text-muted-foreground">
            {row.original.status === "PENDING" && row.original.lastReconciledAt
              ? "Recently checked"
              : `Updated ${row.original.ageMinutes}m ago`}
          </p>
        </div>
      ),
    },
    {
      id: "action",
      header: "View",
      cell: ({ row }) => <DataTableRowActions actions={[{ id: "view", label: `View payment details for ${row.original.id.slice(0, 8)}`, icon: Eye, onSelect: () => onView(row.original) }]} />,
    },
  ];
}

export function buildPaymentStatCards(counts: PaymentCounts) {
  return [
    {
      label: "Pending",
      value: counts.pending,
      helper: "Awaiting provider confirmation",
      icon: Clock3,
      tone: "warning" as const,
    },
    {
      label: "Confirmation delayed",
      value: counts.delayed,
      helper: "Taking longer than expected",
      icon: TimerReset,
      tone: "warning" as const,
    },
    {
      label: "Stuck",
      value: counts.stuck,
      helper: "Requires operational attention",
      icon: AlertCircle,
      tone: "danger" as const,
    },
    {
      label: "Reversed",
      value: counts.reversed,
      helper: "Previously successful payments reversed",
      icon: RotateCcw,
      tone: "danger" as const,
    },
    {
      label: "Needs review",
      value: counts.needsReview,
      helper: "Exceptions requiring investigation",
      icon: CircleAlert,
      tone: "danger" as const,
    },
  ];
}
