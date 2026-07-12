"use client";

import * as React from "react";
import { 
  Search, Eye, MoreVertical, AlertTriangle, CheckCircle2, 
  Clock, Truck, XCircle, ShoppingCart, Coins, ArrowUpRight, 
  Info, Calendar, User, MapPin, CreditCard
} from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { mockDatabase } from "@/data/mockDatabase";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Define strict typing for order tracking and escrow oversight
interface SupervisedOrder {
  id: string;
  customerName: string;
  customerEmail: string;
  storeName: string;
  totalAmount: number;
  paymentMethod: "MTN MoMo" | "Airtel Money" | "Visa/Mastercard";
  paymentGateway: "Pesapal" | "Stripe";
  deliveryStatus: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  deliveryLocation: string;
  date: string;
  isDisputed: boolean;
}

export default function AdminOrdersPage() {
  // Initialize state directly instead of using useEffect
  const [orders, setOrders] = React.useState<SupervisedOrder[]>(() => [
    {
      id: "SD-ORD-9021",
      customerName: "Brian Namanya",
      customerEmail: "brian@namanya.com",
      storeName: mockDatabase.stores[0]?.name || "Apex Sportswear",
      totalAmount: 385000,
      paymentMethod: "MTN MoMo",
      paymentGateway: "Pesapal",
      deliveryStatus: "delivered",
      deliveryLocation: "Ntinda, Kampala",
      date: "June 28, 2026",
      isDisputed: false,
    },
    {
      id: "SD-ORD-8943",
      customerName: "Fiona Atwine",
      customerEmail: "fiona.atwine@gmail.com",
      storeName: mockDatabase.stores[1]?.name || "Sound & Vision",
      totalAmount: 1250000,
      paymentMethod: "Visa/Mastercard",
      paymentGateway: "Stripe",
      deliveryStatus: "processing",
      deliveryLocation: "Kireka, Kampala",
      date: "June 29, 2026",
      isDisputed: false,
    },
    {
      id: "SD-ORD-8712",
      customerName: "Derrick Opio",
      customerEmail: "opioderrick@yahoo.com",
      storeName: mockDatabase.stores[0]?.name || "Apex Sportswear",
      totalAmount: 240000,
      paymentMethod: "Airtel Money",
      paymentGateway: "Pesapal",
      deliveryStatus: "pending",
      deliveryLocation: "Wandegeya, Kampala",
      date: "June 30, 2026",
      isDisputed: true,
    },
  ]);
  
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedOrder, setSelectedOrder] = React.useState<SupervisedOrder | null>(null);

  // Administrative Governance: Flagging transactions during customer/vendor disputes
  const handleToggleDispute = React.useCallback((id: string) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id !== id) return ord;
        const updatedOrder = { ...ord, isDisputed: !ord.isDisputed };
        setSelectedOrder((current) => current?.id === id ? updatedOrder : current);
        return updatedOrder;
      })
    );
  }, []);

  const filteredOrders = React.useMemo(() => {
    return orders.filter(
      (ord) =>
        ord.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ord.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ord.storeName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [orders, searchQuery]);

  // Aggregate platform sales metrics dynamically
  const totalOrdersCount = orders.length;
  const totalSalesVolume = orders.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const totalHeldEscrow = orders
    .filter((o) => o.deliveryStatus !== "delivered" && !o.isDisputed)
    .reduce((acc, curr) => acc + curr.totalAmount, 0);

  // ==========================================
  // TRANSACTION MONITORING COLUMNS
  // ==========================================
  const columns = React.useMemo<ColumnDef<SupervisedOrder, unknown>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Order Ref",
        cell: ({ row }) => (
          <button
            onClick={() => setSelectedOrder(row.original)}
            className="font-mono text-xs font-medium text-primary hover:underline cursor-pointer outline-none text-left"
          >
            {row.original.id}
          </button>
        ),
      },
      {
        accessorKey: "customerName",
        header: "Customer Details",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <span className="font-medium text-foreground block tracking-tight">
              {row.original.customerName}
            </span>
            <span className="text-[10px] text-muted-foreground block font-medium">
              {row.original.date}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "storeName",
        header: "Selling Duka",
        cell: ({ row }) => (
          <span className="font-semibold text-foreground tracking-tight">
            {row.original.storeName}
          </span>
        ),
      },
      {
        accessorKey: "totalAmount",
        header: "Order Value",
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            UGX {row.original.totalAmount.toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "paymentMethod",
        header: "Payment Stream",
        cell: ({ row }) => (
          <div className="space-y-0.5 select-none">
            <span className="font-semibold text-foreground block">{row.original.paymentMethod}</span>
            <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider block">
              Via {row.original.paymentGateway}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "deliveryStatus",
        header: "Fulfillment Status",
        cell: ({ row }) => {
          const status = row.original.deliveryStatus;
          const isDisputed = row.original.isDisputed;

          if (isDisputed) {
            return (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-600 bg-rose-500/5 border border-rose-500/10 px-2.5 py-0.5 rounded-full select-none">
                <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
                <span>Flagged Dispute</span>
              </span>
            );
          }

          return (
            <span className={cn(
              "inline-flex items-center gap-1 text-[10px] font-medium px-2.5 py-0.5 rounded-full border select-none capitalize",
              status === "delivered" && "text-emerald-600 bg-emerald-500/5 border-emerald-500/10",
              status === "pending" && "text-amber-600 bg-amber-500/5 border-amber-500/10",
              status === "processing" && "text-blue-600 bg-blue-500/5 border-blue-500/10",
              status === "shipped" && "text-purple-600 bg-purple-500/5 border-purple-500/10",
              status === "cancelled" && "text-zinc-500 bg-zinc-500/5 border-zinc-500/10"
            )}>
              {status === "delivered" && <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />}
              {status === "pending" && <Clock className="w-3 h-3 stroke-[2.5]" />}
              {status === "shipped" && <Truck className="w-3 h-3 stroke-[2.5]" />}
              {status === "cancelled" && <XCircle className="w-3 h-3 stroke-[2.5]" />}
              <span>{status}</span>
            </span>
          );
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">Oversight</div>,
        cell: ({ row }) => {
          const isDisputed = row.original.isDisputed;
          return (
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedOrder(row.original)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-md border border-border/40 hover:bg-muted bg-card transition-colors cursor-pointer"
                title="Inspect Full Invoice Breakdown"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-7 border border-border/40 rounded-md text-muted-foreground cursor-pointer outline-none">
                    <MoreVertical className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-xl border border-border/60 p-1 text-xs font-medium bg-card text-card-foreground shadow-md">
                  <DropdownMenuItem 
                    onClick={() => setSelectedOrder(row.original)}
                    className="rounded-lg py-2 px-2.5 font-semibold text-xs flex items-center gap-2 cursor-pointer outline-none text-foreground focus:bg-muted"
                  >
                    <Info className="size-3.5" />
                    <span>View Audit Records</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/40 my-1" />
                  <DropdownMenuItem 
                    onClick={() => handleToggleDispute(row.original.id)}
                    className={cn(
                      "rounded-lg py-2 px-2.5 font-semibold text-xs flex items-center gap-2 cursor-pointer outline-none",
                      isDisputed ? "text-emerald-600 focus:bg-emerald-500/5" : "text-rose-600 focus:bg-rose-500/5"
                    )}
                  >
                    <AlertTriangle className="size-3.5" />
                    <span>{isDisputed ? "Resolve & Clear Payout" : "Flag Trade Dispute"}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [handleToggleDispute]
  );

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      
      {/* 1. TOP MODULE INTRODUCTION */}
      <div className="space-y-1 select-none">
        <h2 className="text-xl font-medium tracking-tight text-foreground">Platform Orders Ledger</h2>
        <p className="text-xs font-semibold text-muted-foreground">
          Monitor marketplace payment flows, verify split-escrow hold states, and track fulfillment cycles handled by independent vendors.
        </p>
      </div>

      {/* 2. SALES FLOW KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 select-none">
        {[
          { label: "Total Platform Orders", value: totalOrdersCount, icon: ShoppingCart, style: "bg-card border-border/60" },
          { label: "Total Gross Sales Volume", value: `UGX ${totalSalesVolume.toLocaleString()}`, icon: ArrowUpRight, style: "bg-card border-border/60" },
          { label: "Held in Escrow Payouts", value: `UGX ${totalHeldEscrow.toLocaleString()}`, icon: Coins, style: "bg-card border-border/60 text-primary dark:text-emerald-400" },
        ].map((kpi, idx) => (
          <div key={idx} className={cn("border rounded-2xl p-4 flex items-center justify-between shadow-2xs", kpi.style)}>
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
              <h3 className="text-xl sm:text-2xl font-medium text-foreground tracking-tight">{kpi.value}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-muted/60 border border-border/40 text-muted-foreground">
              <kpi.icon className="w-4 h-4" />
            </div>
          </div>
        ))}
      </div>

      {/* 3. INVOICE OVERVIEW DATA TABLE */}
      <DataTable
        columns={columns}
        data={filteredOrders}
        getRowId={(row) => row.id}
        renderTabs={
          <div className="flex items-center gap-3 w-full max-w-xs relative group">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              placeholder="Search by Order ID or Client Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 border-border/60 rounded-full bg-muted/20 placeholder:text-muted-foreground/40 text-xs focus-visible:ring-primary/20 focus-visible:border-primary"
            />
          </div>
        }
      />

      {/* ==========================================
        4. DEEP-LEVEL SIDEBAR ORDER AUDITOR SHEET
      ========================================== */}
      <Sheet open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        {selectedOrder && (
          <SheetContent side="right" className="w-full sm:max-w-md bg-card border-l border-border/60 p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              
              <SheetHeader className="text-left select-none px-0">
                <SheetTitle className="text-base font-medium text-foreground leading-tight">
                  Invoice Summary: {selectedOrder.id}
                </SheetTitle>
                <SheetDescription className="text-xs font-medium text-muted-foreground font-mono">
                  Settlement Pipeline Security Layer
                </SheetDescription>
              </SheetHeader>

              {/* Status Flag Banner */}
              <div className={cn(
                "p-4 rounded-xl border flex flex-col gap-1.5 select-none",
                selectedOrder.isDisputed 
                  ? "bg-rose-500/5 border-rose-500/20 text-rose-700 dark:text-rose-400" 
                  : "bg-muted/40 border-border/40 text-foreground"
              )}>
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
                  {selectedOrder.isDisputed ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4 text-muted-foreground" />}
                  <span>Trading State: {selectedOrder.isDisputed ? "Disputed Escrow Lock" : "Standard Processing"}</span>
                </div>
                <p className="text-[11px] font-medium opacity-90 leading-relaxed">
                  {selectedOrder.isDisputed 
                    ? "Payout algorithms have frozen vendor dispatch balances for this row. Earnings will remain held in the escrow safety wallet until administrative mediation resolves the issue." 
                    : "Fulfillment actions are currently controlled by the merchant. The system will release fund segments after confirmation of delivery clearance vectors."}
                </p>
              </div>

              {/* Granular Metadata Split Breakdown */}
              <div className="space-y-4 text-xs font-medium">
                
                {/* Section A: Customer Details */}
                <div className="space-y-2 border-b border-border/40 pb-3">
                  <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider select-none">Buyer Contact Profile</h4>
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-muted border border-border/40 flex items-center justify-center text-muted-foreground select-none">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="font-medium text-foreground block">{selectedOrder.customerName}</span>
                      <span className="text-[11px] text-muted-foreground font-mono block">{selectedOrder.customerEmail}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground mt-1 pl-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span>Dropoff: {selectedOrder.deliveryLocation}</span>
                  </div>
                </div>

                {/* Section B: Financial Split Mapping */}
                <div className="space-y-2 border-b border-border/40 pb-3">
                  <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider select-none">Financial Ledger Breakdown</h4>
                  <div className="space-y-1.5 bg-muted/20 p-3 border border-border/40 rounded-xl">
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Total Gross Charged:</span>
                      <span className="font-medium text-foreground">UGX {selectedOrder.totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-muted-foreground text-[11px]">
                      <span>Est. Platform Commission (10%):</span>
                      <span className="font-semibold text-emerald-600">UGX {(selectedOrder.totalAmount * 0.1).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-muted-foreground text-[11px]">
                      <span>Est. Net Vendor Payoffout:</span>
                      <span className="font-semibold text-foreground">UGX {(selectedOrder.totalAmount * 0.9).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Section C: Technical Gateway Signals */}
                <div className="space-y-2 select-none">
                  <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Gateway Telemetry Trace</h4>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Input Node Channel:</span>
                    <span className="font-medium text-foreground">{selectedOrder.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Timestamp Log:</span>
                    <span className="font-medium text-foreground">{selectedOrder.date}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground flex items-center gap-1.5"><ShoppingCart className="w-3.5 h-3.5" /> Dispatched From Duka:</span>
                    <span className="font-medium text-foreground">{selectedOrder.storeName}</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Actions Footer Panel */}
            <div className="flex flex-col gap-2 border-t border-border/40 pt-4 mt-6">
              {/* Dispute Control Action Switch */}
              <Button 
                type="button" 
                variant={selectedOrder.isDisputed ? "default" : "destructive"}
                onClick={() => handleToggleDispute(selectedOrder.id)}
                className={cn(
                  "w-full h-10 rounded-xl text-xs font-medium gap-1.5 cursor-pointer text-white",
                  selectedOrder.isDisputed 
                    ? "bg-primary hover:bg-emerald-600" 
                    : "bg-rose-500 hover:bg-rose-600"
                )}
              >
                <AlertTriangle className="w-4 h-4" />
                <span>{selectedOrder.isDisputed ? "Clear Disputed Escrow Hold" : "Flag Dispute & Freeze Payout"}</span>
              </Button>

              <Button 
                variant="secondary"
                onClick={() => setSelectedOrder(null)}
                className="w-full h-10 rounded-xl text-xs font-medium border border-border/40 text-muted-foreground hover:text-foreground cursor-pointer mt-1"
              >
                Close Audit Record
              </Button>
            </div>
          </SheetContent>
        )}
      </Sheet>

    </div>
  );
}