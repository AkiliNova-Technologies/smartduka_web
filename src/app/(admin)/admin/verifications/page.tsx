"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, FileSearch, Search, ShieldAlert } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { AdminMetricCard } from "@/components/admin/admin-metric-card";
import { DataTable } from "@/components/data-table";
import { ShopVerificationStatusBadge } from "@/components/marketplace/shop-verification-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type Row = { id: string; publicId: string; status: string; submittedAt: string; assignedAdmin?: { name: string } | null; vendor: { storeName: string; slug: string; owner: { name: string | null; email: string } } };

function QueueSkeleton() { return <div className="space-y-6"><div className="space-y-2"><Skeleton className="h-7 w-48" /><Skeleton className="h-4 w-80" /></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-2xl" />)}</div><Skeleton className="h-80 rounded-2xl" /></div>; }

export default function AdminVerificationsPage() {
  const [data, setData] = useState<any>(); const [status, setStatus] = useState(""); const [query, setQuery] = useState(""); const [error, setError] = useState("");
  const load = () => fetch(`/api/admin/verifications${status ? `?status=${status}` : ""}`).then(r => r.json()).then(v => v.success ? setData(v.data) : setError("Unable to load shop verifications.")).catch(() => setError("Unable to load shop verifications."));
  useEffect(() => { void load(); }, [status]);
  const rows = useMemo(() => (data?.items ?? []).filter((item: Row) => [item.publicId, item.vendor.storeName, item.vendor.owner.name, item.vendor.owner.email].filter(Boolean).some(value => String(value).toLowerCase().includes(query.toLowerCase()))), [data, query]);
  const columns = useMemo<ColumnDef<Row>[]>(() => [{ accessorKey: "vendor.storeName", header: "Shop", cell: ({ row }) => <div className="min-w-40"><Link href={`/admin/verifications/${row.original.id}`} className="font-medium hover:text-primary">{row.original.vendor.storeName}</Link><p className="mt-0.5 text-xs text-muted-foreground">{row.original.vendor.owner.name || row.original.vendor.owner.email}</p></div> }, { accessorKey: "status", header: "Status", cell: ({ row }) => <ShopVerificationStatusBadge status={row.original.status} /> }, { accessorKey: "assignedAdmin", header: "Assigned to", cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.assignedAdmin?.name || "Unassigned"}</span> }, { accessorKey: "submittedAt", header: "Submitted", cell: ({ row }) => <span className="text-sm text-muted-foreground">{new Date(row.original.submittedAt).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" })}</span> }, { id: "actions", header: () => <span className="sr-only">Actions</span>, cell: ({ row }) => <Button asChild size="sm" variant="outline" className="h-8 rounded-lg text-xs"><Link href={`/admin/verifications/${row.original.id}`}>Review</Link></Button> }], []);
  if (!data && !error) return <QueueSkeleton />;
  return <main className="w-full space-y-6"><header className="space-y-1"><h1 className="text-xl font-medium tracking-tight text-foreground">Shop verifications</h1><p className="text-xs text-muted-foreground">Review and manage shop verification applications.</p></header>{error ? <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Unable to load shop verifications.<Button variant="outline" size="sm" className="ml-3" onClick={() => void load()}>Try again</Button></div> : <><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><AdminMetricCard label="Pending" value={data.metrics.pending} icon={Clock3} tone="warning" /><AdminMetricCard label="Under review" value={data.metrics.reviewing} icon={FileSearch} tone="info" /><AdminMetricCard label="Needs information" value={data.metrics.needsInformation} icon={ShieldAlert} tone="warning" /><AdminMetricCard label="Verified" value={data.metrics.verified} icon={CheckCircle2} tone="success" /></div><div className="flex flex-wrap items-center gap-2">{[["", "All"], ["PENDING", "Pending"], ["UNDER_REVIEW", "Under review"], ["NEEDS_INFORMATION", "Needs information"], ["VERIFIED", "Verified"], ["SUSPENDED", "Suspended"], ["REVOKED", "Revoked"]].map(([value, label]) => <Button key={value || "all"} size="sm" variant={status === value ? "default" : "outline"} className="rounded-full text-xs" onClick={() => setStatus(value)}>{label}</Button>)}</div><DataTable columns={columns} data={rows} getRowId={row => row.id} isLoading={false} renderTabs={<div className="relative w-full max-w-xs"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search shops or owners..." className="h-9 rounded-full bg-muted/20 pl-9 text-xs" /></div>} /></>}</main>;
}
