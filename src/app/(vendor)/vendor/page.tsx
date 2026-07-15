"use client";

import * as React from "react";
import { BarChart3, ShoppingBag, DollarSign, Wallet } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { useVendor } from "@/hooks/use-vendor";
import { Skeleton } from "@/components/ui/skeleton";

interface OrderActivity {
  id: string;
  customerName: string;
  customerPhone: string;
  status: string;
  vendorTotal: number;
  subOrderNumber: string;
  deliveryAddress: string;
  createdAt: string;
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-56 rounded-md" />
        <Skeleton className="h-3 w-72 rounded-md" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

export default function VendorOverviewPage() {
  const { vendorOrders, vendorOrdersLoading, profile, loading: profileLoading } = useVendor();

  const loading = profileLoading || vendorOrdersLoading;

  const totalRevenue = vendorOrders.reduce((sum, o) => sum + o.vendorTotal, 0);
  const pendingEscrowAmount = vendorOrders
    .filter((o) => o.status === "PENDING" || o.status === "PROCESSING" || o.status === "READY_FOR_PICKUP")
    .reduce((sum, o) => sum + o.vendorTotal, 0);
  const activeShipments = vendorOrders.filter((o) => o.status === "SHIPPED").length;
  const completedOrders = vendorOrders.filter((o) => o.status === "DELIVERED").length;

  const columns: ColumnDef<OrderActivity, unknown>[] = [
    {
      accessorKey: "subOrderNumber",
      header: "Order Token",
      cell: ({ row }) => (
        <span className="font-medium font-mono text-primary tracking-tight text-xs">
          {String(row.getValue("subOrderNumber"))}
        </span>
      ),
    },
    {
      id: "customer",
      header: "Customer ",
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div className="flex flex-col select-none">
            <span className="font-medium text-xs">{order.customerName}</span>
          </div>
        );
      },
    },
    {
      id: "contact",
      header: "Contact",
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div className="flex flex-col select-none">
            <span className="font-medium text-xs">
              {order.customerPhone}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "deliveryAddress",
      header: "Delivery",
      cell: ({ row }) => (
        <span className="text-muted-foreground font-semibold text-[11px] line-clamp-1 max-w-[180px]">
          {String(row.getValue("deliveryAddress"))}
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
              status === "DELIVERED"
                ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/20"
                : status === "SHIPPED"
                  ? "bg-blue-500/5 text-blue-500 border-blue-500/20"
                  : status === "READY_FOR_PICKUP"
                    ? "bg-purple-500/5 text-purple-500 border-purple-500/20"
                    : "bg-amber-500/5 text-amber-500 border-amber-500/20"
            }`}>
            {status.replace(/_/g, " ")}
          </span>
        );
      },
    },
    {
      accessorKey: "vendorTotal",
      header: () => <div className="text-right">Invoice</div>,
      cell: ({ row }) => {
        const total = row.getValue("vendorTotal") as number;
        return (
          <div className="text-right font-medium text-foreground text-xs">
            UGX {total.toLocaleString()}
          </div>
        );
      },
    },
  ];

  if (loading && vendorOrders.length === 0) return <OverviewSkeleton />;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="select-none">
        <h1 className="text-2xl font-medium tracking-tight text-foreground">
          Performance Overview
        </h1>
        <p className="text-xs font-semibold text-muted-foreground mt-0.5">
          {profile?.storeName
            ? `Real-time snapshot for ${profile.storeName} — monitoring trade margins, escrow allocations, and delivery tracking.`
            : "Real-time snapshot monitoring trade margins, escrow allocations, and delivery tracking."}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 select-none">
        {[
          {
            title: "Gross Revenue",
            value: `UGX ${totalRevenue.toLocaleString()}`,
            desc: "Lifetime accrued store volume",
            icon: DollarSign,
            color: "text-emerald-500 bg-emerald-500/5",
          },
          {
            title: "Escrow Balance",
            value: `UGX ${pendingEscrowAmount.toLocaleString()}`,
            desc: "Funds awaiting delivery verification",
            icon: Wallet,
            color: "text-amber-500 bg-amber-500/5",
          },
          {
            title: "Active Shipments",
            value: activeShipments.toString(),
            desc: "Packages currently out with riders",
            icon: ShoppingBag,
            color: "text-blue-500 bg-blue-500/5",
          },
          {
            title: "Completed Orders",
            value: completedOrders.toString(),
            desc: "Successfully delivered & unlocked",
            icon: BarChart3,
            color: "text-purple-500 bg-purple-500/5",
          },
        ].map((card, idx) => (
          <div
            key={idx}
            className="bg-card text-card-foreground border border-border/60 rounded-2xl p-5 space-y-3 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)]">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {card.title}
              </span>
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
        data={vendorOrders as OrderActivity[]}
        getRowId={(order) => order.id}
        isLoading={vendorOrdersLoading}
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