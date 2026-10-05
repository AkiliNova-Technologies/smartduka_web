"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AdminMetricCard } from "@/components/admin/admin-metric-card";
import { AlertTriangle, CircleDot, Inbox, CheckCircle2 } from "lucide-react";
type Report = {
  id: string;
  publicId: string;
  targetTitleSnapshot: string;
  targetType: string;
  reason: string;
  status: string;
  severity: string;
  createdAt: string;
  assignedAdmin: { name: string } | null;
};
const title = (v: string) =>
  v.replaceAll("_", " ").replace(/\b\w/g, (x) => x.toUpperCase());
export default function AdminMarketplaceReportsPage() {
  const [reports, setReports] = useState<Report[]>([]),
    [metrics, setMetrics] = useState({
      open: 0,
      unassigned: 0,
      critical: 0,
      resolvedToday: 0,
    }),
    [view, setView] = useState(""),
    [status, setStatus] = useState(""),
    [severity, setSeverity] = useState(""),
    [type, setType] = useState(""),
    [reason, setReason] = useState(""),
    [unassigned, setUnassigned] = useState(false),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    const q = new URLSearchParams({
      ...(view ? { view } : {}),
      ...(status ? { status } : {}),
      ...(severity ? { severity } : {}),
      ...(type ? { targetType: type } : {}),
      ...(reason ? { reason } : {}),
      ...(unassigned ? { unassigned: "true" } : {}),
    });
    void Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });
    fetch(`/api/admin/marketplace-reports?${q}`)
      .then((r) => r.json())
      .then((v) => {
        if (!cancelled) {
          setReports(v.data?.items || []);
          setMetrics(v.data?.metrics || {
            open: 0,
            unassigned: 0,
            critical: 0,
            resolvedToday: 0,
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [view, status, severity, type, reason, unassigned]);
  const columns = useMemo<ColumnDef<Report, unknown>[]>(
    () => [
      {
        accessorKey: "publicId",
        header: "Case",
        cell: ({ row }) => (
          <Link
            className="font-mono text-xs text-primary hover:underline"
            href={`/admin/reports/${row.original.id}`}>
            {row.original.publicId}
          </Link>
        ),
      },
      {
        accessorKey: "targetTitleSnapshot",
        header: "Target",
        cell: ({ row }) => (
          <Link
            className="font-medium hover:underline"
            href={`/admin/reports/${row.original.id}`}>
            {row.original.targetTitleSnapshot}
            <span className="block text-xs text-muted-foreground">
              {title(row.original.targetType)} · {title(row.original.reason)}
            </span>
          </Link>
        ),
      },
      {
        accessorKey: "severity",
        header: "Severity",
        cell: ({ row }) => (
          <span className="text-xs font-semibold">
            {title(row.original.severity)}
          </span>
        ),
      },
      {
        accessorKey: "assignedAdmin",
        header: "Assignee",
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.assignedAdmin?.name || "Unassigned"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <span className="text-xs font-semibold">
            {title(row.original.status)}
          </span>
        ),
      },
    ],
    [],
  );
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Marketplace reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Trust and safety case-management queue.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Open" value={metrics.open} icon={CircleDot} />
        <AdminMetricCard
          label="Unassigned"
          value={metrics.unassigned}
          icon={Inbox}
          tone="warning"
        />
        <AdminMetricCard
          label="Critical"
          value={metrics.critical}
          icon={AlertTriangle}
          tone="danger"
        />
        <AdminMetricCard
          label="Resolved today"
          value={metrics.resolvedToday}
          icon={CheckCircle2}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {[
          ["", "All cases"],
          ["mine", "My cases"],
          ["unassigned", "Unassigned"],
          ["critical", "Critical"],
          ["new", "New"],
          ["resolved", "Recently resolved"],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => {
              setView(value);
              setUnassigned(false);
            }}
            className={`rounded-full border px-3 py-2 text-xs font-semibold ${view === value ? "bg-primary text-primary-foreground" : "bg-card"}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Select value={status || "all"} onValueChange={(value) => setStatus(value === "all" ? "" : value)}>
          <SelectTrigger aria-label="Status" className="h-9 rounded-full text-xs w-full">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent className="p-2">
            <SelectItem value="all">All statuses</SelectItem>
          {[
            "SUBMITTED",
            "UNDER_REVIEW",
            "AWAITING_INFORMATION",
            "ACTION_REQUIRED",
            "RESOLVED",
            "DISMISSED",
          ].map((v) => (
            <SelectItem key={v} value={v}>{title(v)}</SelectItem>
          ))}
          </SelectContent>
        </Select>
        <Select value={severity || "all"} onValueChange={(value) => setSeverity(value === "all" ? "" : value)}>
          <SelectTrigger aria-label="Severity" className="h-9 rounded-full text-xs w-full">
            <SelectValue placeholder="All severities" />
          </SelectTrigger>
          <SelectContent className="p-2">
            <SelectItem value="all">All severities</SelectItem>
          {["UNASSESSED", "LOW", "MEDIUM", "HIGH", "CRITICAL"].map((v) => (
            <SelectItem key={v} value={v}>{title(v)}</SelectItem>
          ))}
          </SelectContent>
        </Select>
        <Select value={type || "all"} onValueChange={(value) => setType(value === "all" ? "" : value)}>
          <SelectTrigger aria-label="Target type" className="h-9 rounded-full text-xs w-full">
            <SelectValue placeholder="All targets" />
          </SelectTrigger>
          <SelectContent className="p-2">
            <SelectItem value="all">All targets</SelectItem>
            <SelectItem value="PRODUCT">Product</SelectItem>
            <SelectItem value="SHOP">Shop</SelectItem>
          </SelectContent>
        </Select>
        <Select value={reason || "all"} onValueChange={(value) => setReason(value === "all" ? "" : value)}>
          <SelectTrigger aria-label="Reason" className="h-9 rounded-full text-xs w-full">
            <SelectValue placeholder="All reasons" />
          </SelectTrigger>
          <SelectContent className="p-2">
            <SelectItem value="all">All reasons</SelectItem>
          {[
            "COUNTERFEIT",
            "MISLEADING_INFORMATION",
            "PROHIBITED_ITEM",
            "INAPPROPRIATE_CONTENT",
            "WRONG_CATEGORY",
            "PRICE_MANIPULATION",
            "INTELLECTUAL_PROPERTY",
            "SCAM_OR_FRAUD",
            "IMPERSONATION",
            "ABUSIVE_BEHAVIOR",
            "SPAM",
            "OTHER",
          ].map((v) => (
            <SelectItem key={v} value={v}>{title(v)}</SelectItem>
          ))}
          </SelectContent>
        </Select>

        <label className="flex h-9 items-center gap-2 rounded-full border px-3 text-xs">
          <Checkbox
            checked={unassigned}
            onCheckedChange={(checked) => setUnassigned(checked === true)}
          />
          Unassigned only
        </label>
      </div>
      <DataTable
        columns={columns}
        data={reports}
        getRowId={(row) => row.id}
        isLoading={loading}
        searchPlaceholder="Search cases"
      />
    </div>
  );
}
