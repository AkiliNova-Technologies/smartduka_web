"use client";

import * as React from "react";
import {
  Search, Eye, CheckCircle2, Clock, Truck, XCircle,
  ShoppingCart, Coins, User, MapPin,
} from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAdmin } from "@/hooks/use-admin";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderRow } from "@/types/marketplace";

const SUB_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING: { label: "Pending", color: "text-amber-600 bg-amber-500/5 border-amber-500/10", icon: Clock },
  PROCESSING: { label: "Processing", color: "text-blue-600 bg-blue-500/5 border-blue-500/10", icon: Clock },
  READY_FOR_PICKUP: { label: "Ready for Pickup", color: "text-purple-600 bg-purple-500/5 border-purple-500/10", icon: Truck },
  SHIPPED: { label: "Shipped", color: "text-indigo-600 bg-indigo-500/5 border-indigo-500/10", icon: Truck },
  DELIVERED: { label: "Delivered", color: "text-emerald-600 bg-emerald-500/5 border-emerald-500/10", icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled", color: "text-rose-600 bg-rose-500/5 border-rose-500/10", icon: XCircle },
  REFUNDED: { label: "Refunded", color: "text-zinc-500 bg-zinc-500/5 border-zinc-500/10", icon: XCircle },
};

export default function AdminOrdersPage() {
  const { orders, ordersLoading } = useAdmin();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedOrder, setSelectedOrder] = React.useState<OrderRow | null>(null);

  const filteredOrders = React.useMemo(() => {
    if (!searchQuery) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.storeName.toLowerCase().includes(q)
    );
  }, [orders, searchQuery]);

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const pendingOrders = orders.filter((o) => o.subOrderStatus === "PENDING" || o.subOrderStatus === "PROCESSING").length;

  const columns = React.useMemo<ColumnDef<OrderRow, unknown>[]>(
    () => [
      {
        accessorKey: "orderNumber",
        header: "Order",
        cell: ({ row }) => (
          <button onClick={() => setSelectedOrder(row.original)} className="font-mono text-xs font-medium text-primary hover:underline cursor-pointer text-left">
            {row.original.orderNumber}
          </button>
        ),
      },
      {
        accessorKey: "customerName",
        header: "Customer",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <span className="font-medium text-foreground text-xs">{row.original.customerName}</span>
          </div>
        ),
      },
      {
        accessorKey: "storeName",
        header: "Store",
        cell: ({ row }) => <span className="text-xs font-medium text-foreground">{row.original.storeName}</span>,
      },
      {
        accessorKey: "totalAmount",
        header: "Amount",
        cell: ({ row }) => <span className="text-xs font-medium text-foreground">UGX {row.original.totalAmount.toLocaleString()}</span>,
      },
      {
        accessorKey: "subOrderStatus",
        header: "Status",
        cell: ({ row }) => {
          const config = SUB_STATUS_CONFIG[row.original.subOrderStatus] || SUB_STATUS_CONFIG.PENDING;
          const Icon = config.icon;
          return (
            <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border", config.color)}>
              <Icon className="w-3 h-3" />{config.label}
            </span>
          );
        },
      },
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {new Date(row.original.date).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">View</div>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end">
            <button onClick={() => setSelectedOrder(row.original)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg border border-border/40 hover:bg-muted transition-colors cursor-pointer" title="View order details">
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  const loading = ordersLoading && orders.length === 0;

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      <div className="space-y-1 select-none">
        <h2 className="text-xl font-medium tracking-tight text-foreground">All Orders</h2>
        <p className="text-xs text-muted-foreground">View every order across all stores. Track payment status and fulfillment progress.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 select-none">
        {[
          { label: "Total Orders", value: totalOrders, icon: ShoppingCart, color: "text-blue-600" },
          { label: "Total Revenue", value: `UGX ${totalRevenue.toLocaleString()}`, icon: Coins, color: "text-emerald-600" },
          { label: "Pending", value: pendingOrders, icon: Clock, color: "text-amber-600" },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-card border border-border/60 rounded-2xl p-4 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
              <kpi.icon className={cn("w-4 h-4", kpi.color)} />
            </div>
            <p className="text-2xl font-semibold text-foreground tracking-tight">{kpi.value}</p>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filteredOrders}
        getRowId={(row) => row.id}
        isLoading={loading}
        renderTabs={
          <div className="flex items-center gap-3 w-full max-w-xs relative group">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input placeholder="Search by order number, customer, or store..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 border-border/60 rounded-full bg-muted/20 placeholder:text-muted-foreground/40 text-xs focus-visible:ring-primary/20" />
          </div>
        }
      />

      <Sheet open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        {selectedOrder && (
          <SheetContent side="right" className="w-full sm:max-w-md bg-card border-l border-border/60 p-6 overflow-y-auto">
            <SheetHeader className="text-left px-0">
              <SheetTitle className="text-base font-medium">Order {selectedOrder.orderNumber}</SheetTitle>
              <SheetDescription className="text-xs font-mono text-muted-foreground">ID: {selectedOrder.id}</SheetDescription>
            </SheetHeader>

            <div className="space-y-5 mt-6">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Status</span>
                {(() => {
                  const config = SUB_STATUS_CONFIG[selectedOrder.subOrderStatus] || SUB_STATUS_CONFIG.PENDING;
                  const Icon = config.icon;
                  return (
                    <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border", config.color)}>
                      <Icon className="w-3 h-3" />{config.label}
                    </span>
                  );
                })()}
              </div>

              <div className="border-t border-border/40 pt-4 space-y-3">
                <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Customer</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground"><User className="w-3.5 h-3.5" />{selectedOrder.customerName}</div>
                  <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="w-3.5 h-3.5" />{selectedOrder.deliveryLocation}</div>
                </div>
              </div>

              <div className="border-t border-border/40 pt-4 space-y-3">
                <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Order Details</h4>
                <div className="space-y-2 text-xs">
                  <p><strong className="text-foreground">Store:</strong> {selectedOrder.storeName}</p>
                  <p><strong className="text-foreground">Amount:</strong> UGX {selectedOrder.totalAmount.toLocaleString()}</p>
                  <p><strong className="text-foreground">Payment:</strong> {selectedOrder.paymentGateway}</p>
                  <p><strong className="text-foreground">Date:</strong> {new Date(selectedOrder.date).toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-border/40 pt-4 mt-6">
              <Button variant="secondary" onClick={() => setSelectedOrder(null)} className="w-full h-10 rounded-xl text-xs font-medium border cursor-pointer">Close</Button>
            </div>
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}