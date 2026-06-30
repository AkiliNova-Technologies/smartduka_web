"use client";
"use no memo"; // Bypasses React Compiler conflicts for TanStack configurations

import * as React from "react";
import { BarChart3, ShoppingBag, DollarSign, Wallet } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { mockDatabase } from "@/data/mockDatabase";
import { DataTable } from "@/components/data-table";

interface OrderActivity {
  id: string;
  customerName: string;
  customerPhone: string;
  paymentMethod: string;
  status: string;
  total: number;
}

export default function VendorOverviewPage() {
  const shopOrders = mockDatabase.orders.filter(o => o.storeId === "st-nike-ug-001");
  
  const totalRevenue = shopOrders.reduce((sum: number, o) => sum + o.total, 0);
  const pendingEscrowAmount = shopOrders
  .filter((o: { status: string; total: number }) => o.status === "Pending" || o.status === "In Transit")
  .reduce((sum: number, o: { total: number }) => sum + o.total, 0);

  const columns: ColumnDef<OrderActivity, unknown>[] = [
    {
      accessorKey: "id",
      header: "Order Token",
      cell: ({ row }) => (
        <span className="font-medium font-mono text-primary tracking-tight">
          {String(row.getValue("id"))}
        </span>
      ),
    },
    {
      id: "customer",
      header: "Customer Details",
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div className="flex flex-col select-none">
            <span className="font-medium">{order.customerName}</span>
            <span className="text-[10px] text-muted-foreground font-semibold mt-0.5">
              {order.customerPhone}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "paymentMethod",
      header: "Payment Protection",
      cell: ({ row }) => (
        <span className="text-muted-foreground font-semibold">
          {String(row.getValue("paymentMethod"))}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider border transition-all ${
              status === "Delivered" ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/20" :
              status === "In Transit" ? "bg-blue-500/5 text-blue-500 border-blue-500/20" :
              "bg-amber-500/5 text-amber-500 border-amber-500/20"
            }`}
          >
            {status}
          </span>
        );
      },
    },
    {
      accessorKey: "total",
      header: () => <div className="text-right">Invoice</div>,
      cell: ({ row }) => {
        const total = row.getValue("total") as number;
        return (
          <div className="text-right font-medium text-foreground">
            UGX {total.toLocaleString()}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="select-none">
        <h1 className="text-2xl font-medium tracking-tight text-foreground">Performance Overview</h1>
        <p className="text-xs font-semibold text-muted-foreground mt-0.5">
          Real-time snapshot monitoring trade margins, buyer lock allocations, and delivery tracking.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 select-none">
        {[
          { title: "Gross Orders Volume", value: `UGX ${totalRevenue.toLocaleString()}`, desc: "Lifetime accrued store volume", icon: DollarSign, color: "text-emerald-500 bg-emerald-500/5" },
          { title: "Locked Smart-Escrow", value: `UGX ${pendingEscrowAmount.toLocaleString()}`, desc: "In-transit delivery verification funds", icon: Wallet, color: "text-amber-500 bg-amber-500/5" },
          { title: "Active Shipments", value: shopOrders.filter(o => o.status === "In Transit").length.toString(), desc: "Packages currently out with riders", icon: ShoppingBag, color: "text-blue-500 bg-blue-500/5" },
          { title: "Completed Orders", value: shopOrders.filter(o => o.status === "Delivered").length.toString(), desc: "Successfully unlocked drop receipts", icon: BarChart3, color: "text-purple-500 bg-purple-500/5" },
        ].map((card, idx) => (
          <div key={idx} className="bg-card text-card-foreground border border-border/60 rounded-2xl p-5 space-y-3 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)]">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.title}</span>
              <div className={`p-2 rounded-xl border border-current/10 ${card.color}`}>
                <card.icon className="w-4 h-4 stroke-[2]" />
              </div>
            </div>
            <div className="space-y-0.5">
              <h3 className="text-xl font-medium tracking-tight">{card.value}</h3>
              <p className="text-[11px] text-muted-foreground font-medium">{card.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={shopOrders}
        getRowId={(order) => order.id}
        renderTabs={
          <div className="flex items-center select-none">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
              Recent Activity Pipeline
            </span>
          </div>
        }
      />
    </div>
  );
}