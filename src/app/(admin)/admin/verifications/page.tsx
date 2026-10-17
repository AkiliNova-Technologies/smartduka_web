"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Eye,
  FileSearch,
  ShieldAlert,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { AdminMetricCard } from "@/components/admin/admin-metric-card";
import { DataTable } from "@/components/data-table";
import { ShopVerificationStatusBadge } from "@/components/marketplace/shop-verification-status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableStatusFilter } from "@/components/data-table-status-filter";
import { DataTableRowActions } from "@/components/data-table-row-actions";
import { adminShopVerificationClient, type VerificationQueue } from "@/lib/admin-shop-verification-client";

type Row = {
  id: string;
  publicId: string;
  status: string;
  submittedAt: string;
  assignedAdmin?: { name: string } | null;
  vendor: {
    storeName: string;
    slug: string;
    owner: { name: string | null; email: string };
  };
};

function QueueSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}

export default function AdminVerificationsPage() {
  const [data, setData] = useState<VerificationQueue>();
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      try { setData(await adminShopVerificationClient.queue(status, signal)); setError(""); }
      catch { if (!signal?.aborted) setError("Unable to load shop verifications."); }
      finally { if (!signal?.aborted) setLoading(false); }
    },
    [status],
  );
  useEffect(() => {
    const controller = new AbortController();
    const task = window.setTimeout(() => void load(controller.signal), 0);
    return () => { window.clearTimeout(task); controller.abort(); };
  }, [load]);
  const rows = data?.items ?? [];
  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        accessorKey: "vendor.storeName",
        header: "Shop",
        cell: ({ row }) => (
          <div className="min-w-40">
            <Link
              href={`/admin/verifications/${row.original.id}`}
              className="font-medium hover:text-primary">
              {row.original.vendor.storeName}
            </Link>
          </div>
        ),
      },
      {
        accessorKey: "vendor.owner",
        header: "Owner",
        cell: ({ row }) => (
          <div className="min-w-40">
            <p className="mt-0.5 text-xs text-muted-foreground">
              {row.original.vendor.owner.name ||
                row.original.vendor.owner.email}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <ShopVerificationStatusBadge status={row.original.status} />
        ),
      },
      {
        accessorKey: "assignedAdmin",
        header: "Assigned to",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.assignedAdmin?.name || "Unassigned"}
          </span>
        ),
      },
      {
        accessorKey: "submittedAt",
        header: "Submitted",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {new Date(row.original.submittedAt).toLocaleDateString("en-UG", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <DataTableRowActions
            actions={[
              {
                id: "review",
                label: "Review",
                icon: Eye,
                href: `/admin/verifications/${row.original.id}`,
              },
            ]}
          />
        ),
      },
    ],
    [],
  );
  if (!data && loading) return <QueueSkeleton />;
  return (
    <main className="w-full space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-medium tracking-tight text-foreground">
          Shop verifications
        </h1>
        <p className="text-xs text-muted-foreground">
          Review and manage shop verification applications.
        </p>
      </header>
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Unable to load shop verifications.
          <Button
            variant="outline"
            size="sm"
            className="ml-3"
            onClick={() => { setLoading(true); void load(); }}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AdminMetricCard
              label="Pending"
              value={data?.metrics.pending ?? 0}
              icon={Clock3}
              tone="warning"
            />
            <AdminMetricCard
              label="Under review"
              value={data?.metrics.reviewing ?? 0}
              icon={FileSearch}
              tone="info"
            />
            <AdminMetricCard
              label="Needs information"
              value={data?.metrics.needsInformation ?? 0}
              icon={ShieldAlert}
              tone="warning"
            />
            <AdminMetricCard
              label="Verified"
              value={data?.metrics.verified ?? 0}
              icon={CheckCircle2}
              tone="success"
            />
          </div>
          <DataTableStatusFilter
            value={status || "ALL"}
            onValueChange={(value) => { setLoading(true); setStatus(value === "ALL" ? "" : value); }}
            options={[
              ["ALL", "All statuses"],
              ["PENDING", "Pending"],
              ["UNDER_REVIEW", "Under review"],
              ["NEEDS_INFORMATION", "Needs information"],
              ["VERIFIED", "Verified"],
              ["REJECTED", "Rejected"],
              ["SUSPENDED", "Suspended"],
              ["REVOKED", "Revoked"],
            ].map(([value, label]) => ({ value, label }))}
          />
          <DataTable
            columns={columns}
            data={rows}
            getRowId={(row) => row.id}
            isLoading={loading}
            features={{ search: true }}
            searchPlaceholder="Search verifications..."
            getSearchText={(row) =>
              [
                row.publicId,
                row.vendor.storeName,
                row.vendor.slug,
                row.vendor.owner.name,
                row.vendor.owner.email,
              ]
                .filter(Boolean)
                .join(" ")
            }
            emptyStateContent={<div className="py-6 text-center"><p className="font-medium">No verification applications found</p><p className="mt-1 text-sm text-muted-foreground">Try another status or search term.</p></div>}
          />
        </>
      )}
    </main>
  );
}
