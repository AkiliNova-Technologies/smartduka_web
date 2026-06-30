"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import {
  FileChartColumn,
  Percent,
  DollarSign,
  DownloadCloud,
} from "lucide-react";
import { mockDatabase } from "@/data/mockDatabase";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PayoutReportRow {
  id: string;
  cycleDate: string;
  ordersCount: number;
  grossSales: number;
  commissionDeducted: number;
  netPayout: number;
  status: "Settled" | "Processing" | "On Hold";
}

export default function VendorReportsPage() {
  // 1. Sourcing and aggregating data metrics
  const vendorOrders = mockDatabase.orders.filter(
    (o) => o.storeId === "st-nike-ug-001",
  );
  const totalVolume = vendorOrders.reduce((sum, o) => sum + o.total, 0);

  // Simulated platform ledger records
  const payoutHistory: PayoutReportRow[] = [
    {
      id: "PAY-2026-004",
      cycleDate: "June 15 - June 22, 2026",
      ordersCount: 14,
      grossSales: 2450000,
      commissionDeducted: 122500,
      netPayout: 2327500,
      status: "Settled",
    },
    {
      id: "PAY-2026-003",
      cycleDate: "June 08 - June 15, 2026",
      ordersCount: 19,
      grossSales: 3820000,
      commissionDeducted: 191000,
      netPayout: 3629000,
      status: "Settled",
    },
    {
      id: "PAY-2026-002",
      cycleDate: "June 01 - June 08, 2026",
      ordersCount: 8,
      grossSales: 1100000,
      commissionDeducted: 55000,
      netPayout: 1045000,
      status: "Settled",
    },
    {
      id: "PAY-2026-001",
      cycleDate: "May 25 - June 01, 2026",
      ordersCount: 12,
      grossSales: 1950000,
      commissionDeducted: 97500,
      netPayout: 1852500,
      status: "Settled",
    },
  ];

  const handleExportCSV = () => {
    toast.success("Financial transaction sheets exported successfully.");
  };

  // 2. Defining columns for our premium table layout
  const columns: ColumnDef<PayoutReportRow, unknown>[] = [
      {
        accessorKey: "id",
        header: "Payout Token",
        cell: ({ row }) => (
          <span className="font-medium font-mono text-primary tracking-tight">
            {row.getValue("id")}
          </span>
        ),
      },
      {
        accessorKey: "cycleDate",
        header: "Statement Period",
        cell: ({ row }) => (
          <span className="text-muted-foreground font-semibold">
            {row.getValue("cycleDate")}
          </span>
        ),
      },
      {
        accessorKey: "ordersCount",
        header: "Orders",
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {row.getValue("ordersCount")} units
          </span>
        ),
      },
      {
        accessorKey: "grossSales",
        header: "Gross Sales",
        cell: ({ row }) => (
          <span className="font-semibold text-foreground">
            UGX {(row.getValue("grossSales") as number).toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "netPayout",
        header: "Net Settlement",
        cell: ({ row }) => (
          <span className="font-medium text-emerald-500">
            UGX {(row.getValue("netPayout") as number).toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.getValue("status") as string;
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider border bg-emerald-500/5 text-emerald-500 border-emerald-500/20">
              {status}
            </span>
          );
        },
      },
    ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ACTION TOP HEADER CONFIGURATION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5 select-none">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground">
            Financial & Payout Reports
          </h1>
          <p className="text-xs font-semibold text-muted-foreground mt-0.5">
            Evaluate escrow clearances, monitor platform commissions, and track
            weekly sales volumes.
          </p>
        </div>

        <Button
          onClick={handleExportCSV}
          variant="outline"
          className="h-10 px-4 border-border/60 rounded-xl text-xs font-medium tracking-tight bg-background hover:bg-muted/50 active:scale-95 transition-all flex items-center gap-2 cursor-pointer self-end sm:self-auto">
          <DownloadCloud className="w-4 h-4 text-muted-foreground" />
          <span>Export Ledger (CSV)</span>
        </Button>
      </div>

      {/* THREE-CARD REVENUE AND ANCHOR METRICS MATRIX */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 select-none">
        {[
          {
            title: "Accrued Store Payouts",
            value: `UGX ${(totalVolume * 0.95).toLocaleString()}`,
            desc: "Net revenue minus platform splits",
  
            icon: DollarSign,
            color: "text-emerald-500 bg-emerald-500/5",
          },
          {
            title: "SmartDuka Marketplace Split",
            value: `UGX ${(totalVolume * 0.05).toLocaleString()}`,
            desc: "Fixed 5% multi-vendor platform commission",

            icon: Percent,
            color: "text-zinc-500 bg-zinc-500/5",
          },
          {
            title: "Fulfilled Items Margin",
            value: vendorOrders
              .filter((o) => o.status === "Delivered")
              .length.toString(),
            desc: "Completed sales with unlocked protection locks",

            icon: FileChartColumn,
            color: "text-blue-500 bg-blue-500/5",
          },
        ].map((card, idx) => (
          <div
            key={idx}
            className="bg-card text-card-foreground border border-border/60 rounded-2xl p-5 space-y-3 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)]">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {card.title}
              </span>
              <div
                className={`p-2 rounded-xl border border-current/10 ${card.color}`}>
                <card.icon className="w-4 h-4 stroke-[2]" />
              </div>
            </div>
            <div className="space-y-0.5">
              <h3 className="text-xl font-medium tracking-tight">
                {card.value}
              </h3>
              <p className="text-[11px] text-muted-foreground font-medium">
                {card.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* REUSABLE HISTORICAL PAYOUTS DATATABLE PORTING */}
      <DataTable
        columns={columns}
        data={payoutHistory}
        getRowId={(payout) => payout.id}
        renderTabs={
          <div className="flex items-center select-none">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
              Settlement Cycles History
            </span>
          </div>
        }
      />
    </div>
  );
}
