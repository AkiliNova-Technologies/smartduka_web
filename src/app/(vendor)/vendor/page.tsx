"use client";

import * as React from "react";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  ChartNoAxesCombined,
  CircleDollarSign,
  Eye,
  PackageCheck,
  PackagePlus,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { DashboardMetricCard } from "@/components/dashboard-metric-card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useProducts } from "@/hooks/use-products";
import { useVendor } from "@/hooks/use-vendor";
import type { Product } from "@/types/marketplace";

type VendorOrder = ReturnType<typeof useVendor>["vendorOrders"][number];

const actionStatuses = new Set(["PENDING", "PROCESSING", "READY_FOR_PICKUP"]);
const sellableStatuses = new Set(["ACTIVE", "PUBLISHED"]);
const salesChartConfig = {
  sales: { label: "Delivered sales", color: "var(--primary)" },
} satisfies ChartConfig;

function formatCurrency(value: number) {
  return `UGX ${value.toLocaleString("en-UG", { maximumFractionDigits: 0 })}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-UG", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function statusLabel(status: string) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());
}

function isDeliveredSale(order: VendorOrder) {
  return order.paymentStatus === "COMPLETED" && order.status === "DELIVERED";
}

function productInventory(product: Product) {
  const variants = product.variants?.filter(
    (variant) => variant.isActive !== false,
  );
  return variants?.length
    ? variants.reduce((total, variant) => total + variant.inventoryCount, 0)
    : (product.inventoryCount ?? 0);
}

function OrdersStatus({ status }: { status: string }) {
  const tone = ["DELIVERED"].includes(status)
    ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
    : ["CANCELLED", "REFUNDED"].includes(status)
      ? "border-rose-500/20 bg-rose-500/5 text-rose-700 dark:text-rose-400"
      : "border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-400";
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${tone}`}>
      {statusLabel(status)}
    </span>
  );
}

function MetricCard({
  href,
  label,
  value,
  detail,
  icon: Icon,
  tone = "default",
}: {
  href: string;
  label: string;
  value: string | number;
  detail: string;
  icon: typeof ShoppingCart;
  tone?: "default" | "warning";
}) {
  return <DashboardMetricCard href={href} label={label} value={value} description={detail} icon={Icon} tone={tone} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between border-b border-border/40 pb-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}

export default function VendorOverviewPage() {
  const { vendorOrders, vendorOrdersLoading, profile } = useVendor();
  const { products, isLoading: productsLoading } = useProducts();
  const [chartNow, setChartNow] = React.useState<number | null>(null);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setChartNow(Date.now()), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const vendorId = profile?.id;
  const vendorProducts = React.useMemo(
    () =>
      vendorId
        ? products.filter((product) => product.vendorId === vendorId)
        : [],
    [products, vendorId],
  );
  const ordersRequiringAction = React.useMemo(
    () => vendorOrders.filter((order) => actionStatuses.has(order.status)),
    [vendorOrders],
  );
  const activeProducts = React.useMemo(
    () =>
      vendorProducts.filter((product) =>
        sellableStatuses.has(product.status ?? ""),
      ).length,
    [vendorProducts],
  );
  const unavailableProducts = React.useMemo(
    () =>
      vendorProducts.filter(
        (product) =>
          sellableStatuses.has(product.status ?? "") &&
          productInventory(product) === 0,
      ),
    [vendorProducts],
  );
  const deliveredSales = React.useMemo(
    () => vendorOrders.filter(isDeliveredSale),
    [vendorOrders],
  );
  const deliveredSalesTotal = React.useMemo(
    () => deliveredSales.reduce((total, order) => total + order.vendorTotal, 0),
    [deliveredSales],
  );
  const recentOrders = React.useMemo(
    () => vendorOrders.slice(0, 5),
    [vendorOrders],
  );
  const chartData = React.useMemo(
    () => buildSalesChart(deliveredSales, chartNow),
    [chartNow, deliveredSales],
  );

  const orderColumns = React.useMemo<ColumnDef<VendorOrder>[]>(
    () => [
      {
        accessorKey: "subOrderNumber",
        header: "Order",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-primary">
            {row.original.subOrderNumber}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Date",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        accessorKey: "customerName",
        header: "Customer",
        cell: ({ row }) => (
          <span className="max-w-36 truncate text-sm font-medium">
            {row.original.customerName}
          </span>
        ),
      },
      {
        id: "items",
        header: "Items",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.items.length}
          </span>
        ),
      },
      {
        accessorKey: "vendorTotal",
        header: "Your total",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm font-medium tabular-nums">
            {formatCurrency(row.original.vendorTotal)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <OrdersStatus status={row.original.status} />,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button asChild variant="ghost" size="sm" className="h-8 gap-1">
            <Link
              href="/vendor/orders"
              aria-label={`View ${row.original.subOrderNumber}`}>
              <Eye className="size-4" />
              <span className="hidden sm:inline">View</span>
            </Link>
          </Button>
        ),
      },
    ],
    [],
  );

  if (
    (vendorOrdersLoading && !vendorOrders.length) ||
    (productsLoading && !products.length)
  )
    return <DashboardSkeleton />;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 border-b border-border/40 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A practical view of your shop’s fulfilment, products, and completed
            sales.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="h-10 rounded-full">
            <Link href="/vendor/orders">
              <ShoppingCart className="size-4" />
              View orders
            </Link>
          </Button>
          <Button asChild className="h-10 rounded-full dark:text-white">
            <Link href="/vendor/products/new">
              <PackagePlus className="size-4" />
              Add product
            </Link>
          </Button>
        </div>
      </header>

      <section
        aria-label="Business performance"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          href="/vendor/finance"
          label="Delivered sales"
          value={formatCurrency(deliveredSalesTotal)}
          detail="Paid and delivered orders"
          icon={CircleDollarSign}
        />
        <MetricCard
          href="/vendor/orders"
          label="Total orders"
          value={vendorOrders.length}
          detail="All vendor-specific orders"
          icon={ShoppingCart}
        />
        <MetricCard
          href="/vendor/products"
          label="Active products"
          value={activeProducts}
          detail="Published products"
          icon={PackageCheck}
        />
        <MetricCard
          href="/vendor/orders"
          label="Orders requiring action"
          value={ordersRequiringAction.length}
          detail="Pending fulfilment steps"
          icon={AlertTriangle}
          tone="warning"
        />
      </section>

      <section
        aria-labelledby="sales-heading"
        className="rounded-xl border border-border/60 bg-card p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
          <div>
            <h2
              id="sales-heading"
              className="text-lg font-semibold tracking-tight">
              Sales performance
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Delivered, paid sales over the last 14 days.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ChartNoAxesCombined className="size-4" />
            Last 14 days
          </span>
        </div>
        {deliveredSales.length ? (
          <ChartContainer
            config={salesChartConfig}
            className="mt-5 h-64 w-full">
            <AreaChart
              accessibilityLayer
              data={chartData}
              margin={{ left: 8, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={58}
                tickFormatter={(value) =>
                  `${Math.round(Number(value) / 1000)}k`
                }
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                }
              />
              <Area
                dataKey="sales"
                type="monotone"
                fill="var(--color-sales)"
                fillOpacity={0.16}
                stroke="var(--color-sales)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center text-center">
            <ChartNoAxesCombined
              className="size-8 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm font-medium">No delivered sales yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Sales will appear here after an order is paid and delivered.
            </p>
          </div>
        )}
      </section>

      <section aria-labelledby="recent-orders-heading" className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2
              id="recent-orders-heading"
              className="text-lg font-semibold tracking-tight">
              Recent orders
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your latest orders, shown with vendor-specific totals only.
            </p>
          </div>
          <Link
            href="/vendor/orders"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline">
            View all <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <DataTable
          columns={orderColumns}
          data={recentOrders}
          getRowId={(order) => order.id}
          isLoading={vendorOrdersLoading}
          defaultPageSize={5}
          features={{
            pagination: false,
            search: false,
            columnVisibility: false,
            sorting: false,
            filtering: false,
            rowSelection: false,
            toolbar: false,
            footer: false,
          }}
          emptyStateContent={
            <span>
              Customer orders will appear here when your products start selling.
            </span>
          }
          className="rounded-xl p-0"
          containerClassName="gap-0"
        />
      </section>

      <section
        aria-labelledby="operations-heading"
        className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2
                id="operations-heading"
                className="text-lg font-semibold tracking-tight">
                Out-of-stock products
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Products unavailable to customers, including variant stock.
              </p>
            </div>
            <Link
              href="/vendor/products"
              className="text-sm font-medium text-primary hover:underline">
              Manage
            </Link>
          </div>
          {unavailableProducts.length ? (
            <ul className="mt-4 divide-y divide-border/60">
              {unavailableProducts.slice(0, 4).map((product) => (
                <li
                  key={product.id}
                  className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {product.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {product.variants?.length
                        ? "All active variants are out of stock"
                        : "Out of stock"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-rose-500/20 bg-rose-500/5 px-2 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                    Out of stock
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">
              No published products are out of stock.
            </p>
          )}
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Fulfilment queue
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Orders that need a next fulfilment step.
              </p>
            </div>
            <Link
              href="/vendor/orders"
              className="text-sm font-medium text-primary hover:underline">
              Open orders
            </Link>
          </div>
          {ordersRequiringAction.length ? (
            <ul className="mt-4 divide-y divide-border/60">
              {ordersRequiringAction.slice(0, 4).map((order) => (
                <li
                  key={order.id}
                  className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold text-primary">
                      {order.subOrderNumber}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {order.customerName} · {order.items.length} item
                      {order.items.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <OrdersStatus status={order.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">
              There are no orders awaiting fulfilment.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function buildSalesChart(orders: VendorOrder[], now: number | null) {
  if (now === null) return [];
  const formatter = new Intl.DateTimeFormat("en-UG", {
    month: "short",
    day: "numeric",
  });
  const points = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (13 - index));
    return {
      key: date.toISOString().slice(0, 10),
      label: formatter.format(date),
      sales: 0,
    };
  });
  const byDate = new Map(points.map((point) => [point.key, point]));
  for (const order of orders) {
    const point = byDate.get(
      new Date(order.createdAt).toISOString().slice(0, 10),
    );
    if (point) point.sales += order.vendorTotal;
  }
  return points;
}
