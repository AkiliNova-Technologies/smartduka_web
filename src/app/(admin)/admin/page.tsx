"use client";

import * as React from "react";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { ArrowRight, CircleDollarSign, Clock, ShoppingCart, Store, Users } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { DashboardMetricCard } from "@/components/dashboard-metric-card";
import { useAdmin } from "@/hooks/use-admin";
import type { OrderRow, VendorApplicationRow } from "@/types/marketplace";

const reviewStatuses = new Set(["PENDING", "SUBMITTED", "UNDER_REVIEW"]);
const previewFeatures = { pagination: false, search: false, columnVisibility: false, sorting: false, filtering: false, rowSelection: false, toolbar: false, footer: false };

type DashboardUser = { id: string; name: string; email: string; status: string; platformRole: string | null; createdAt: Date | string };

const date = (value: string | Date) => new Intl.DateTimeFormat("en-UG", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
const money = (value: number) => `UGX ${value.toLocaleString("en-UG", { maximumFractionDigits: 0 })}`;
const label = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());

function StatusBadge({ value }: { value: string }) {
  const tone = ["COMPLETED", "DELIVERED", "APPROVED", "ACTIVE"].includes(value) ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400" : ["REJECTED", "CANCELLED", "REFUNDED", "SUSPENDED"].includes(value) ? "border-rose-500/20 bg-rose-500/5 text-rose-700 dark:text-rose-400" : "border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-400";
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}>{label(value)}</span>;
}

function SectionHeader({ title, description, href, action }: { title: string; description: string; href: string; action: string }) {
  return <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div><Link href={href} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">{action}<ArrowRight className="size-4" aria-hidden="true" /></Link></div>;
}

export default function AdminDashboardPage() {
  const { vendors, vendorsLoading, orders, ordersLoading, users, usersLoading, metrics, metricsLoading } = useAdmin();
  const pendingVendors = React.useMemo(() => vendors.filter((vendor) => reviewStatuses.has(vendor.status)), [vendors]);
  const recentOrders = React.useMemo(() => orders.slice(0, 6), [orders]);
  const recentCustomers = React.useMemo(() => (users as DashboardUser[]).filter((user) => user.platformRole === "CUSTOMER").slice(0, 6), [users]);

  const orderColumns = React.useMemo<ColumnDef<OrderRow, unknown>[]>(() => [
    { accessorKey: "orderNumber", header: "Order", cell: ({ row }) => <span className="font-mono text-xs font-semibold text-primary">{row.original.orderNumber}</span> },
    { accessorKey: "customerName", header: "Customer", cell: ({ row }) => <span className="block max-w-36 truncate text-sm font-medium">{row.original.customerName}</span> },
    { accessorKey: "storeName", header: "Shop", cell: ({ row }) => <span className="block max-w-36 truncate text-sm text-muted-foreground">{row.original.storeName}</span> },
    { accessorKey: "totalAmount", header: "Total", cell: ({ row }) => <span className="whitespace-nowrap text-sm font-medium tabular-nums">{money(row.original.totalAmount)}</span> },
    { accessorKey: "paymentStatus", header: "Payment", cell: ({ row }) => <StatusBadge value={row.original.paymentStatus} /> },
    { accessorKey: "subOrderStatus", header: "Fulfilment", cell: ({ row }) => <StatusBadge value={row.original.subOrderStatus} /> },
    { accessorKey: "date", header: "Date", cell: ({ row }) => <span className="whitespace-nowrap text-xs text-muted-foreground">{date(row.original.date)}</span> },
  ], []);

  const vendorColumns = React.useMemo<ColumnDef<VendorApplicationRow, unknown>[]>(() => [
    { accessorKey: "storeName", header: "Shop / applicant", cell: ({ row }) => <div className="min-w-32"><p className="truncate text-sm font-medium">{row.original.storeName}</p><p className="truncate text-xs text-muted-foreground">{row.original.userName}</p></div> },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge value={row.original.status} /> },
    { accessorKey: "createdAt", header: "Submitted", cell: ({ row }) => <span className="whitespace-nowrap text-xs text-muted-foreground">{date(row.original.createdAt)}</span> },
    { id: "action", header: "", cell: () => <Link href="/admin/vendors" className="text-sm font-medium text-primary hover:underline">Review</Link> },
  ], []);

  const userColumns = React.useMemo<ColumnDef<DashboardUser, unknown>[]>(() => [
    { accessorKey: "name", header: "Customer", cell: ({ row }) => <div className="min-w-36"><p className="truncate text-sm font-medium">{row.original.name || "Unnamed customer"}</p><p className="truncate text-xs text-muted-foreground">{row.original.email}</p></div> },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge value={row.original.status} /> },
    { accessorKey: "createdAt", header: "Joined", cell: ({ row }) => <span className="whitespace-nowrap text-xs text-muted-foreground">{date(row.original.createdAt)}</span> },
  ], []);

  return <div className="w-full space-y-8 animate-in fade-in duration-300">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border/40 pb-6"><div><h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1><p className="mt-1 text-sm text-muted-foreground">Monitor marketplace performance, activity and items requiring attention.</p></div><Link href="/admin/vendors" className="inline-flex min-h-10 items-center rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-muted">Review vendor applications</Link></header>

    <section aria-label="Marketplace metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <DashboardMetricCard href="/admin/finance/payments" label="Gross marketplace sales" value={metricsLoading ? "—" : money(metrics?.totalRevenue ?? 0)} description="Completed payments" icon={CircleDollarSign} tone="success" />
      <DashboardMetricCard href="/admin/orders" label="Orders" value={metricsLoading ? "—" : metrics?.totalOrders ?? 0} description="All recorded orders" icon={ShoppingCart} />
      <DashboardMetricCard href="/admin/vendors" label="Active shops" value={metricsLoading ? "—" : metrics?.activeShops ?? 0} description="Publicly eligible shops" icon={Store} tone="info" />
      <DashboardMetricCard href="/admin/users" label="Customers" value={metricsLoading ? "—" : metrics?.totalCustomers ?? 0} description="Registered customer accounts" icon={Users} />
    </section>

    <section className="space-y-4" aria-labelledby="recent-orders"><SectionHeader title="Recent orders" description="Latest marketplace orders and their payment and fulfilment state." href="/admin/orders" action="View all orders" /><DataTable columns={orderColumns} data={recentOrders} getRowId={(order) => order.id} features={previewFeatures} isLoading={ordersLoading} emptyStateContent={<p className="py-5 text-sm text-muted-foreground">No recent orders. New marketplace orders will appear here.</p>} /></section>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(18rem,0.8fr)]">
      <section className="space-y-4" aria-labelledby="vendor-attention"><SectionHeader title="Vendors requiring attention" description="Applications awaiting an operational decision." href="/admin/vendors" action="View all applications" /><DataTable columns={vendorColumns} data={pendingVendors.slice(0, 5)} getRowId={(vendor) => vendor.id} features={previewFeatures} isLoading={vendorsLoading} emptyStateContent={<p className="py-5 text-sm text-muted-foreground">No vendors awaiting review.</p>} /></section>
      <aside className="rounded-xl border border-border/60 bg-card p-5" aria-labelledby="operational-attention"><h2 id="operational-attention" className="text-lg font-semibold tracking-tight">Operational attention</h2><p className="mt-1 text-sm text-muted-foreground">Items that need an administrative decision.</p><div className="mt-5 divide-y divide-border/60"><Link href="/admin/vendors" className="flex items-center justify-between gap-3 py-3 text-sm hover:text-primary"><span>Pending vendor reviews</span><span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-amber-700 dark:text-amber-400">{vendorsLoading ? "—" : pendingVendors.length}</span></Link><Link href="/admin/orders" className="flex items-center justify-between gap-3 py-3 text-sm hover:text-primary"><span>Orders requiring fulfilment</span><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold tabular-nums">{ordersLoading ? "—" : orders.filter((order) => ["PENDING", "PROCESSING", "READY_FOR_PICKUP"].includes(order.subOrderStatus)).length}</span></Link></div></aside>
    </div>

    <section className="space-y-4" aria-labelledby="recent-customers"><SectionHeader title="Recent customers" description="Recently registered marketplace customer accounts." href="/admin/users" action="View all users" /><DataTable columns={userColumns} data={recentCustomers} getRowId={(user) => user.id} features={previewFeatures} isLoading={usersLoading} emptyStateContent={<p className="py-5 text-sm text-muted-foreground">No customer accounts yet.</p>} /></section>
  </div>;
}
