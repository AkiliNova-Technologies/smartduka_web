"use client";

import * as React from "react";
import {
  Truck,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useVendor } from "@/hooks/use-vendor";
import { toast } from "sonner";

function OrdersSkeleton() {
  return (
    <div className="space-y-6">
      <div className="border-b border-border/40 pb-5 space-y-1.5">
        <Skeleton className="h-7 w-48 rounded-md" />
        <Skeleton className="h-3 w-72 rounded-md" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function VendorOrdersPage() {
  const { vendorOrders, vendorOrdersLoading, updateSubOrderStatus } = useVendor();

  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize] = React.useState(10);

  const totalRows = vendorOrders.length;
  const pageCount = Math.ceil(totalRows / pageSize) || 1;
  const canPreviousPage = pageIndex > 0;
  const canNextPage = pageIndex < pageCount - 1;

  const paginatedOrders = React.useMemo(() => {
    const start = pageIndex * pageSize;
    return vendorOrders.slice(start, start + pageSize);
  }, [vendorOrders, pageIndex, pageSize]);

  const handleUpdateStatus = async (subOrderId: string, newStatus: string) => {
    await updateSubOrderStatus(subOrderId, newStatus);
    toast.success(`Order updated to ${newStatus.replace(/_/g, " ")}`);
  };

  if (vendorOrdersLoading && vendorOrders.length === 0) return <OrdersSkeleton />;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-5 select-none">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Order Dispatch Manager
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {vendorOrders.length} order{vendorOrders.length !== 1 ? "s" : ""} · Process incoming buyer orders and coordinate dispatch.
          </p>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {paginatedOrders.length > 0 ? (
          paginatedOrders.map((order) => (
            <div
              key={order.id}
              className="bg-card text-card-foreground border border-border/60 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)]"
            >
              <div className="space-y-2.5 max-w-md flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono font-bold text-xs bg-muted border border-border/60 px-2.5 py-1 rounded-lg text-primary">
                    {order.subOrderNumber}
                  </span>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      order.status === "DELIVERED"
                        ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/20"
                        : order.status === "SHIPPED" || order.status === "READY_FOR_PICKUP"
                          ? "bg-blue-500/5 text-blue-500 border-blue-500/20"
                          : "bg-amber-500/5 text-amber-500 border-amber-500/20"
                    }`}
                  >
                    {order.status === "DELIVERED" && <CheckCircle2 className="w-3 h-3" />}
                    {order.status === "SHIPPED" && <Truck className="w-3 h-3" />}
                    {order.status === "PENDING" && <AlertCircle className="w-3 h-3" />}
                    <span>{order.status.replace(/_/g, " ")}</span>
                  </span>
                </div>

                <div className="space-y-0.5">
                  <p className="text-foreground text-sm font-bold">
                    {order.customerName} · {order.customerPhone}
                  </p>
                  <p className="text-muted-foreground text-[12px] line-clamp-1">
                    {order.deliveryAddress}
                  </p>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Package className="w-3 h-3" />
                    {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between lg:justify-end gap-6 border-t lg:border-t-0 border-border/40 pt-3 lg:pt-0 shrink-0">
                <div className="flex flex-col lg:text-right">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    Total
                  </span>
                  <span className="text-base font-bold text-foreground tracking-tight">
                    UGX {order.vendorTotal.toLocaleString()}
                  </span>
                </div>

                <div className="w-44">
                  <Select
                    value={order.status}
                    onValueChange={(val) => handleUpdateStatus(order.id, val)}
                  >
                    <SelectTrigger className="w-full h-9 rounded-xl text-xs font-medium border-border/60 bg-background hover:bg-muted/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl p-1 min-w-[176px]">
                      <SelectGroup>
                        <SelectItem value="PENDING" className="rounded-lg text-xs py-2">Pending</SelectItem>
                        <SelectItem value="PROCESSING" className="rounded-lg text-xs py-2">Processing</SelectItem>
                        <SelectItem value="READY_FOR_PICKUP" className="rounded-lg text-xs py-2">Ready for Pickup</SelectItem>
                        <SelectItem value="SHIPPED" className="rounded-lg text-xs py-2">Shipped</SelectItem>
                        <SelectItem value="DELIVERED" className="rounded-lg text-xs py-2">Delivered</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="w-full bg-card border border-border/60 rounded-2xl py-12 text-center text-xs font-semibold text-muted-foreground">
            No orders received yet.
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalRows > pageSize && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/40 px-1 select-none">
          <div className="text-xs font-semibold text-muted-foreground">
            Showing <span className="font-bold text-foreground">{paginatedOrders.length}</span> of{" "}
            <span className="font-bold text-foreground">{totalRows}</span> orders
          </div>

          <div className="flex items-center gap-1.5">
            <Button variant="outline" className="size-8 rounded-lg border-border/60 bg-card" size="icon" onClick={() => setPageIndex((p) => p - 1)} disabled={!canPreviousPage}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-xs font-bold text-foreground px-2">
              {pageIndex + 1} / {pageCount}
            </span>
            <Button variant="outline" className="size-8 rounded-lg border-border/60 bg-card" size="icon" onClick={() => setPageIndex((p) => p + 1)} disabled={!canNextPage}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}