"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, LayoutGrid, Package, ShoppingCart, Store, Users } from "lucide-react";
import { AdminMetricCard } from "@/components/admin/admin-metric-card";
import { useAdmin } from "@/hooks/use-admin";

const reviewStatuses = new Set(["PENDING", "SUBMITTED", "UNDER_REVIEW"]);

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" });
}

function reviewLabel(status: string) {
  return status.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
}

export default function AdminDashboardPage() {
  const { vendors, vendorsLoading, orders, ordersLoading } = useAdmin();
  const pendingVendors = vendors.filter((vendor) => reviewStatuses.has(vendor.status));
  const recentVendors = vendors.slice(0, 3);
  const recentOrders = orders.slice(0, 3);

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300">
      <header className="border-b border-border/40 pb-6">
        <h1 className="text-2xl font-medium tracking-tight text-foreground">Admin dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Monitor marketplace activity and handle items that need attention.</p>
      </header>

      <div className="grid max-w-sm grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/admin/vendors" className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <AdminMetricCard label="Pending vendor reviews" value={vendorsLoading ? "—" : pendingVendors.length} icon={Clock} helper="Applications awaiting review" tone="warning" />
        </Link>
      </div>

      <section aria-labelledby="needs-attention-heading" className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="needs-attention-heading" className="text-lg font-semibold tracking-tight text-foreground">Needs attention</h2>
            <p className="mt-1 text-sm text-muted-foreground">Vendor applications that are waiting for an operational decision.</p>
          </div>
          <Link href="/admin/vendors" className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline">View all vendor applications <ArrowRight className="size-4" aria-hidden="true" /></Link>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {vendorsLoading ? (
            <p className="p-5 text-sm text-muted-foreground">Loading vendor applications…</p>
          ) : pendingVendors.length === 0 ? (
            <div className="flex items-center gap-3 p-5"><span className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"><CheckCircle2 className="size-5" aria-hidden="true" /></span><div><p className="text-sm font-medium text-foreground">You’re all caught up</p><p className="text-sm text-muted-foreground">There are no vendor reviews requiring attention right now.</p></div></div>
          ) : (
            <ul className="divide-y divide-border/60">
              {pendingVendors.slice(0, 5).map((vendor) => (
                <li key={vendor.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">{vendor.storeName}</p><p className="truncate text-sm text-muted-foreground">{vendor.userName} · Applied {formatDate(vendor.createdAt)}</p></div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end"><span className="rounded-full border border-amber-500/20 bg-amber-500/5 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">{reviewLabel(vendor.status)}</span><Link href="/admin/vendors" className="text-sm font-medium text-primary hover:underline">Review</Link></div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section aria-labelledby="marketplace-activity-heading" className="space-y-4">
        <div><h2 id="marketplace-activity-heading" className="text-lg font-semibold tracking-tight text-foreground">Marketplace activity</h2><p className="mt-1 text-sm text-muted-foreground">A compact view of the latest orders and vendor applications.</p></div>
        <div className="grid gap-4 lg:grid-cols-2">
          <ActivityCard title="Recent orders" href="/admin/orders" icon={ShoppingCart} empty="No orders have been placed yet." loading={ordersLoading}>
            {recentOrders.map((order) => <li key={order.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate font-mono text-sm font-medium text-primary">{order.orderNumber}</p><p className="truncate text-sm text-muted-foreground">{order.customerName} · {order.storeName}</p></div><span className="shrink-0 text-xs text-muted-foreground">{formatDate(order.date)}</span></li>)}
          </ActivityCard>
          <ActivityCard title="Recent vendor applications" href="/admin/vendors" icon={Store} empty="No vendor applications have been received yet." loading={vendorsLoading}>
            {recentVendors.map((vendor) => <li key={vendor.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{vendor.storeName}</p><p className="truncate text-sm text-muted-foreground">{vendor.userName}</p></div><span className="shrink-0 text-xs text-muted-foreground">{formatDate(vendor.createdAt)}</span></li>)}
          </ActivityCard>
        </div>
      </section>

      <section aria-labelledby="quick-access-heading" className="space-y-3"><h2 id="quick-access-heading" className="text-lg font-semibold tracking-tight text-foreground">Quick access</h2><nav aria-label="Admin quick access" className="flex flex-wrap gap-2">{[
        { href: "/admin/vendors", label: "Vendor applications", icon: Store },
        { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
        { href: "/admin/products", label: "Products", icon: Package },
        { href: "/admin/categories", label: "Categories", icon: LayoutGrid },
        { href: "/admin/users", label: "Users", icon: Users },
      ].map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Icon className="size-4 text-muted-foreground" aria-hidden="true" />{label}</Link>)}</nav></section>
    </div>
  );
}

function ActivityCard({ title, href, icon: Icon, empty, loading, children }: { title: string; href: string; icon: typeof ShoppingCart; empty: string; loading: boolean; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return <section className="rounded-xl border border-border bg-card p-4"><div className="flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-sm font-semibold text-foreground"><Icon className="size-4 text-muted-foreground" aria-hidden="true" />{title}</h3><Link href={href} className="text-sm font-medium text-primary hover:underline">View all</Link></div>{loading ? <p className="py-5 text-sm text-muted-foreground">Loading…</p> : hasChildren ? <ul className="mt-2 divide-y divide-border/60">{children}</ul> : <p className="py-5 text-sm text-muted-foreground">{empty}</p>}</section>;
}
