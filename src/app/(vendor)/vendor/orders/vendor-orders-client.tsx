"use client";

import * as React from "react";
import { CheckCircle2, Eye, Package, Search, Truck } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVendor } from "@/hooks/use-vendor";
import { toast } from "sonner";
import { IllustratedEmptyState } from "@/components/marketplace/illustrated-empty-state";
import type { VendorOrdersResult } from "@/services/vendor-orders";

type VendorOrder = VendorOrdersResult["orders"][number];
const statuses = [
  "ALL",
  "PENDING",
  "PROCESSING",
  "READY_FOR_PICKUP",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;
const label = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const money = (value: number) => `UGX ${value.toLocaleString("en-UG")}`;

export default function VendorOrdersPage({ initialData }: { initialData: VendorOrdersResult }) {
  const { updateSubOrderStatus } = useVendor();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status");
  const tab = statuses.includes(statusParam as (typeof statuses)[number])
    ? (statusParam as (typeof statuses)[number])
    : "ALL";
  const search = searchParams.get("search") || "";
  const [orders, setOrders] = React.useState<VendorOrder[]>(initialData.orders);
  const pagination = initialData.pagination;
  const statusCounts = initialData.statusCounts;
  const [selected, setSelected] = React.useState<VendorOrder | null>(null);
  const [updating, setUpdating] = React.useState<string | null>(null);
  const updateQuery = React.useCallback(
    (next: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(next).forEach(([key, value]) =>
        value ? params.set(key, value) : params.delete(key),
      );
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const counts = Object.fromEntries(
    statuses.map((status) => [
      status,
      status === "ALL" ? pagination.total : statusCounts[status] || 0,
    ]),
  );

  const transition = async (
    order: VendorOrder,
    action: { status: string; label: string },
  ) => {
    if (
      action.status === "DELIVERED" &&
      !window.confirm("Mark this order as delivered?")
    )
      return;
    setUpdating(order.id);
    try {
      const confirmed = await updateSubOrderStatus(order.id, action.status);
      toast.success(`Order ${label(confirmed).toLowerCase()}.`);
      setSelected((current) =>
        current?.id === order.id
          ? { ...current, status: confirmed, allowedActions: [] }
          : current,
      );
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status: confirmed, allowedActions: [] } : item));
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update this order.",
      );
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="border-b border-border/40 pb-5">
        <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Work through fulfilment steps without losing customer context.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={tab}
          onValueChange={(value) => updateQuery({ status: value, page: "1" })}>
          <div className="overflow-x-auto pb-1">
            <TabsList className="min-w-max" aria-label="Order status">
              {statuses.map((status) => (
                <TabsTrigger key={status} value={status} className="text-xs">
                  {status === "ALL" ? "All" : label(status)}{" "}
                  <span className="text-muted-foreground">
                    {counts[status]}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
        <div className="relative w-full sm:w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) =>
              updateQuery({ search: event.target.value || null, page: "1" })
            }
            placeholder="Search orders"
            className="h-9 rounded-full pl-9 text-sm"
          />
        </div>
      </div>
      <div className="space-y-4">
        {orders.length ? (
          orders.map((order) => (
            <article
              key={order.id}
              className="flex flex-col justify-between gap-5 rounded-2xl border border-border/60 bg-card p-5 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1 space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="max-w-full truncate rounded-lg border border-border/60 bg-muted px-2.5 py-1 font-mono text-xs font-bold text-primary"
                    title={order.subOrderNumber}>
                    {order.subOrderNumber}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString("en-UG", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <Status value={order.status} />
                </div>
                <div>
                  <p className="text-sm font-bold">{order.customerName}</p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {order.deliveryAddress}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Package className="size-3" />
                    {order.items.length} item
                    {order.items.length === 1 ? "" : "s"} ·{" "}
                    {order.paymentStatus === "COMPLETED"
                      ? "Payment confirmed"
                      : `Payment ${label(order.paymentStatus).toLowerCase()}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-3 lg:border-t-0 lg:pt-0">
                <p className="text-sm font-bold tabular-nums">
                  {money(order.vendorTotal)}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setSelected(order)}
                  aria-label={`View ${order.subOrderNumber}`}>
                  <Eye className="size-4" />
                  <span className="sr-only sm:not-sr-only sm:ml-1">View</span>
                </Button>
                {order.allowedActions[0] ? (
                  <Button
                    size="sm"
                    disabled={updating === order.id}
                    className="rounded-full dark:text-white px-4"
                    onClick={() => transition(order, order.allowedActions[0])}>
                    {updating === order.id
                      ? "Updating…"
                      : order.allowedActions[0].label}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {["DELIVERED", "CANCELLED", "REFUNDED"].includes(
                      order.status,
                    )
                      ? "Final status"
                      : "No next action"}
                  </span>
                )}
              </div>
            </article>
          ))
        ) : (
          <IllustratedEmptyState
            illustration="/illustrations/vendor-empty-orders.svg"
            title={
              tab === "ALL" ? "No orders yet" : "No orders match this status"
            }
            description={
              tab === "ALL"
                ? "Customer orders will appear here when your products start selling."
                : "Choose another status to view your order history."
            }
            size="compact"
          />
        )}
      </div>
      <PaginationControls
        pageIndex={pagination.page - 1}
        pageSize={pagination.pageSize}
        pageCount={pagination.totalPages}
        total={pagination.total}
        pageSizeOptions={[10, 20, 50]}
        onPageChange={(pageIndex) =>
          updateQuery({ page: String(pageIndex + 1) })
        }
        onPageSizeChange={(nextPageSize) =>
          updateQuery({ pageSize: String(nextPageSize), page: "1" })
        }
      />
      <Sheet
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}>
        {selected && (
          <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>Order {selected.subOrderNumber}</SheetTitle>
              <SheetDescription>
                Fulfilment details for your shop only.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-6 px-4 pb-6 text-sm">
              <section>
                <h2 className="font-semibold">Order summary</h2>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Detail
                    label="Placed"
                    value={new Date(selected.createdAt).toLocaleDateString(
                      "en-UG",
                      { dateStyle: "medium" },
                    )}
                  />
                  <Detail
                    label="Payment"
                    value={
                      selected.paymentStatus === "COMPLETED"
                        ? "Payment confirmed"
                        : `Payment ${label(selected.paymentStatus).toLowerCase()}`
                    }
                  />
                  <Detail label="Order status" value={label(selected.status)} />
                  <Detail
                    label="Your total"
                    value={money(selected.vendorTotal)}
                  />
                </div>
              </section>
              <section>
                <h2 className="font-semibold">Items</h2>
                <div className="mt-3 divide-y rounded-xl border">
                  {selected.items.map((item, index) => (
                    <div
                      key={`${item.name}-${index}`}
                      className="flex justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} × {money(item.price)}
                        </p>
                      </div>
                      <p className="shrink-0 font-medium tabular-nums">
                        {money(item.total)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <h2 className="font-semibold">Customer & delivery</h2>
                <div className="mt-3 space-y-2 rounded-xl border p-3">
                  <p>{selected.customerName}</p>
                  <p>{selected.customerPhone}</p>
                  <p className="text-muted-foreground">
                    {selected.deliveryAddress}
                  </p>
                  {selected.notes && (
                    <p className="border-t pt-2 text-muted-foreground">
                      Note: {selected.notes}
                    </p>
                  )}
                </div>
              </section>
              {(selected.issues.returns.length ||
                selected.issues.refunds.length ||
                selected.issues.disputes.length) > 0 && (
                <section>
                  <h2 className="font-semibold">Customer issues</h2>
                  <div className="mt-3 space-y-2 rounded-xl border p-3 text-xs">
                    {selected.issues.returns.map((status, index) => (
                      <p key={`return-${index}`}>
                        Return {label(status).toLowerCase()}
                      </p>
                    ))}
                    {selected.issues.refunds.map((status, index) => (
                      <p key={`refund-${index}`}>
                        Refund {label(status).toLowerCase()}
                      </p>
                    ))}
                    {selected.issues.disputes.map((status, index) => (
                      <p key={`dispute-${index}`}>
                        Dispute {label(status).toLowerCase()}
                      </p>
                    ))}
                  </div>
                </section>
              )}
              <section className="flex flex-wrap gap-2">
                {selected.allowedActions.map((action) => (
                  <Button
                    key={action.status}
                    disabled={updating === selected.id}
                    onClick={() => transition(selected, action)}>
                    {updating === selected.id ? "Updating…" : action.label}
                  </Button>
                ))}
              </section>
            </div>
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}
function Status({ value }: { value: string }) {
  const delivered = value === "DELIVERED";
  const shipped = value === "SHIPPED" || value === "READY_FOR_PICKUP";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${delivered ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-600" : shipped ? "border-blue-500/20 bg-blue-500/5 text-blue-600" : "border-amber-500/20 bg-amber-500/5 text-amber-600"}`}>
      {delivered ? (
        <CheckCircle2 className="size-3" />
      ) : shipped ? (
        <Truck className="size-3" />
      ) : null}
      {label(value)}
    </span>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}
