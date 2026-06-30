"use client";

import * as React from "react";
import { mockDatabase } from "@/data/mockDatabase";
import {
  Truck,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type VendorStatus = "Pending" | "In Transit" | "Delivered";

export default function VendorOrdersPage() {
  // 1. Core local state tracking seeded from mock database records
  const [ordersState, setOrdersState] = React.useState(() =>
    mockDatabase.orders.filter((o) => o.storeId === "st-nike-ug-001")
  );

  // 2. Pagination state configurations
  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);

  // Status mutation engine restricted entirely to vendor lifecycle actions
  const handleUpdateStatus = (orderId: string, newStatus: VendorStatus) => {
    setOrdersState((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
    toast.success(`Order ${orderId} updated to ${newStatus}`);
  };

  const totalRows = ordersState.length;
  const pageCount = Math.ceil(totalRows / pageSize) || 1;
  const canPreviousPage = pageIndex > 0;
  const canNextPage = pageIndex < pageCount - 1;

  // Track page items shown bounds for clear user display feedback
  const paginatedOrders = React.useMemo(() => {
    const start = pageIndex * pageSize;
    const end = start + pageSize;
    return ordersState.slice(start, end);
  }, [ordersState, pageIndex, pageSize]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* SECTION HEADER BLOCK */}
      <div className="border-b border-border/40 pb-5 select-none">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Order Dispatch Manager
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Process incoming buyer orders, verify lock status flags, and
          coordinate with dispatch riders across city grids.
        </p>
      </div>

      {/* DYNAMIC CARD RENDER FEED LOOP */}
      <div className="space-y-4">
        {paginatedOrders.length > 0 ? (
          paginatedOrders.map((order) => (
            <div
              key={order.id}
              className="bg-card text-card-foreground border border-border/60 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)] hover:border-border transition-colors group"
            >
              {/* Left Block Identifier Meta */}
              <div className="space-y-2.5 max-w-md">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono font-bold text-xs bg-muted border border-border/60 px-2.5 py-1 rounded-lg text-primary tracking-tight group-hover:bg-primary/5 transition-colors">
                    {order.id}
                  </span>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {order.date}
                  </span>
                  
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${
                      order.status === "Delivered" ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/20" : 
                      order.status === "In Transit" ? "bg-blue-500/5 text-blue-500 border-blue-500/20" :
                      "bg-amber-500/5 text-amber-500 border-amber-500/20"
                    }`}
                  >
                    {order.status === "Delivered" && <CheckCircle2 className="w-3 h-3" />}
                    {order.status === "In Transit" && <Truck className="w-3 h-3" />}
                    {order.status === "Pending" && <AlertCircle className="w-3 h-3" />}
                    <span>{order.status}</span>
                  </span>
                </div>

                <div className="space-y-0.5  font-medium">
                  <p className="text-foreground text-sm font-bold">
                    Recipient: {order.customerName} ({order.customerPhone})
                  </p>
                  <p className="text-muted-foreground text-[12px] line-clamp-1 leading-relaxed">
                    Destination: {order.deliveryAddress}
                  </p>
                </div>
              </div>

              {/* Right Action Block with Clean System Select Dropdown */}
              <div className="flex items-center justify-between lg:justify-end gap-6 border-t lg:border-t-0 border-border/40 pt-3 lg:pt-0 shrink-0">
                <div className="flex flex-col lg:text-right select-none">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    Order Total
                  </span>
                  <span className="text-base font-bold text-foreground tracking-tight">
                    UGX {order.total.toLocaleString()}
                  </span>
                </div>

                {/* Refined Custom Select implementation */}
                <div className="w-44">
                  <Select
                    value={order.status}
                    onValueChange={(val) => handleUpdateStatus(order.id, val as VendorStatus)}
                  >
                    <SelectTrigger className="w-full h-9 rounded-xl text-xs font-medium border-border/60 bg-background hover:bg-muted/50 tracking-tight transition-all px-3">
                      <SelectValue placeholder={order.status} />
                    </SelectTrigger>
                    <SelectContent position="popper" className="rounded-xl p-1 min-w-[176px]">
                      <SelectGroup>
                        <SelectItem value="Pending" className="rounded-lg text-xs py-2">
                          Pending Approval
                        </SelectItem>
                        <SelectItem value="In Transit" className="rounded-lg text-xs py-2">
                          Out with Rider
                        </SelectItem>
                        <SelectItem value="Delivered" className="rounded-lg text-xs py-2">
                          Delivered & Closed
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

              </div>
            </div>
          ))
        ) : (
          <div className="w-full bg-card border border-border/60 rounded-2xl py-12 text-center text-xs font-semibold text-muted-foreground select-none">
            No pipeline orders found within this index block.
          </div>
        )}
      </div>

      {/* FOOTER PAGINATION */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/40 px-1 select-none w-full">
        <div className="text-xs font-semibold text-muted-foreground select-none">
          Showing <span className="font-bold text-foreground">{paginatedOrders.length}</span> of <span className="font-bold text-foreground">{totalRows}</span> total orders
        </div>

        <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-6 lg:gap-8">
          <div className="hidden items-center gap-2.5 lg:flex">
            <Label htmlFor="rows-per-page" className="text-xs text-muted-foreground uppercase tracking-wider">
              Rows per page
            </Label>
            <Select value={`${pageSize}`} onValueChange={(value) => setPageSize(Number(value))}>
              <SelectTrigger size="sm" className="w-20 h-8 rounded-lg border-border/60 text-xs bg-card" id="rows-per-page">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent side="top" className="rounded-xl border-border/60 p-1">
                <SelectGroup>
                  {[5, 10, 20, 30, 40].map((size) => (
                    <SelectItem key={size} value={`${size}`} className="rounded-lg text-xs font-semibold">
                      {size}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="text-xs font-bold text-foreground tracking-tight">
            Page {pageIndex + 1} of {pageCount}
          </div>

          <div className="flex items-center gap-1.5">
            <Button variant="outline" className="hidden h-8 w-8 p-0 rounded-lg border-border/60 lg:flex active:scale-95 transition-transform bg-card" onClick={() => setPageIndex(0)} disabled={!canPreviousPage}>
              <ChevronsLeft className="size-4 opacity-70" />
            </Button>
            <Button variant="outline" className="size-8 rounded-lg border-border/60 active:scale-95 transition-transform bg-card" size="icon" onClick={() => setPageIndex((p) => p - 1)} disabled={!canPreviousPage}>
              <ChevronLeft className="size-4 opacity-70" />
            </Button>
            <Button variant="outline" className="size-8 rounded-lg border-border/60 active:scale-95 transition-transform bg-card" size="icon" onClick={() => setPageIndex((p) => p + 1)} disabled={!canNextPage}>
              <ChevronRight className="size-4 opacity-70" />
            </Button>
            <Button variant="outline" className="hidden size-8 rounded-lg border-border/60 lg:flex active:scale-95 transition-transform bg-card" size="icon" onClick={() => setPageIndex(pageCount - 1)} disabled={!canNextPage}>
              <ChevronsRight className="size-4 opacity-70" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}