"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  MessageSquare,
  Building2,
  Eye,
} from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";

// Basic interface for marketplace customer complaints
interface CustomerReport {
  id: string;
  shopName: string;
  reportedItem: string;
  reason: string;
  reportedBy: string;
  date: string;
  status: "Pending" | "Resolved" | "Dismissed";
  details: string;
}

// Local mock data reflecting typical marketplace report situations
const mockReports: CustomerReport[] = [
  {
    id: "REP-101",
    shopName: "Kikuubo Online",
    reportedItem: "Sony Wireless Woofer",
    reason: "Counterfeit / Fake Product",
    reportedBy: "Peter S.",
    date: "24 June, 2026",
    status: "Pending",
    details: "The customer claims the woofer received is a knock-off and does not match the original Sony branding displayed on the website.",
  },
  {
    id: "REP-102",
    shopName: "Juba Electronics",
    reportedItem: "iPhone 13 Pro Max",
    reason: "Wrong item delivered",
    reportedBy: "Grace A.",
    date: "28 June, 2026",
    status: "Resolved",
    details: "Seller sent an iPhone 12 instead of an iPhone 13. Duka has processed a swap and client is satisfied.",
  },
  {
    id: "REP-103",
    shopName: "KLA Boutique",
    reportedItem: "Designer Air Jordan Sneakers",
    reason: "Price trickery / Overcharging",
    reportedBy: "Musa K.",
    date: "30 June, 2026",
    status: "Dismissed",
    details: "Customer complained about the price changing, but the store had clear delivery fee warnings on their bio profile.",
  }
];

export default function AdminReportsPage() {
  // Initialize state directly instead of using useEffect
  const [reports, setReports] = React.useState<CustomerReport[]>(mockReports);
  const [selectedReport, setSelectedReport] = React.useState<CustomerReport | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const handleStatusChange = (id: string, newStatus: CustomerReport["status"]) => {
    setReports(
      reports.map((rep) => (rep.id === id ? { ...rep, status: newStatus } : rep))
    );
    setDrawerOpen(false);
  };

  const filteredReports = React.useMemo(() => {
    return reports.filter(
      (rep) =>
        rep.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rep.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rep.reportedItem.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [reports, searchQuery]);

  const totalPending = reports.filter((r) => r.status === "Pending").length;
  const totalResolved = reports.filter((r) => r.status === "Resolved").length;

  // ==========================================
  // TABLE COLUMNS (PLAIN ENGLISH)
  // ==========================================
  const columns = React.useMemo<ColumnDef<CustomerReport, unknown>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Report ID",
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.id}</span>,
      },
      {
        accessorKey: "shopName",
        header: "Shop Name",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{row.original.shopName}</span>
          </div>
        ),
      },
      {
        accessorKey: "reportedItem",
        header: "Item Involved",
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.reportedItem}</span>,
      },
      {
        accessorKey: "reason",
        header: "Reason / Issue",
        cell: ({ row }) => <span className="font-medium text-rose-600 dark:text-rose-400">{row.original.reason}</span>,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <span
            className={cn(
              "text-[10px] font-medium px-2 py-0.5 rounded-full border inline-flex items-center gap-1",
              row.original.status === "Pending" && "bg-amber-500/5 border-amber-500/10 text-amber-600",
              row.original.status === "Resolved" && "bg-emerald-500/5 border-emerald-500/10 text-emerald-600",
              row.original.status === "Dismissed" && "bg-zinc-500/5 border-zinc-500/10 text-zinc-500"
            )}
          >
            {row.original.status}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Review</div>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] rounded-full gap-1 border-border/60"
              onClick={() => {
                setSelectedReport(row.original);
                setDrawerOpen(true);
              }}
            >
              <Eye className="w-3 h-3" />
              <span>Investigate</span>
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      {/* 1. TOP HEADER */}
      <div className="space-y-1 select-none">
        <h2 className="text-xl font-medium tracking-tight text-foreground">
          Customer Complaints & Flags
        </h2>
        <p className="text-xs font-semibold text-muted-foreground">
          Track issues reported by buyers regarding faulty products, fake descriptions, or seller misconduct.
        </p>
      </div>

      {/* 2. SUMMARY COUNTERS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 select-none">
        {[
          {
            label: "Needs Attention (Pending)",
            value: totalPending,
            icon: AlertTriangle,
            style: "bg-card border-border/60 text-amber-600 dark:text-amber-400",
          },
          {
            label: "Settled Issues",
            value: totalResolved,
            icon: CheckCircle2,
            style: "bg-card border-border/60 text-emerald-600 dark:text-emerald-400",
          },
        ].map((kpi, idx) => (
          <div
            key={idx}
            className={cn(
              "border rounded-2xl p-4 flex items-center justify-between shadow-2xs",
              kpi.style
            )}
          >
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {kpi.label}
              </span>
              <h3 className="text-2xl font-medium text-foreground tracking-tight">
                {kpi.value}
              </h3>
            </div>
            <div className="p-2.5 rounded-full bg-muted/60 border border-border/40 text-muted-foreground">
              <kpi.icon className="w-4 h-4" />
            </div>
          </div>
        ))}
      </div>

      {/* 3. CORE TABLE */}
      <DataTable
        columns={columns}
        data={filteredReports}
        getRowId={(row) => row.id}
        renderTabs={
          <div className="flex items-center gap-3 w-full max-w-xs relative group">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              placeholder="Search by shop or complaint..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 border-border/60 rounded-full bg-muted/20 font-medium placeholder:text-muted-foreground/40 text-xs focus-visible:ring-primary/20"
            />
          </div>
        }
      />

      {/* 4. INVESTIGATION SIDE PANEL DRAWER */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md bg-card border-l border-border/60 p-6 flex flex-col justify-between"
        >
          {selectedReport && (
            <div className="flex flex-col h-full justify-between">
              <div className="space-y-6 overflow-y-auto max-h-[80vh] pr-1">
                <SheetHeader className="text-left select-none px-0">
                  <div className="flex items-center gap-2 text-rose-500 font-medium text-xs uppercase tracking-wider">
                    <span>Active Case File</span>
                  </div>
                  <SheetTitle className="text-base font-medium text-foreground">
                    Review {selectedReport.id}
                  </SheetTitle>
                  <SheetDescription className="text-xs font-medium text-muted-foreground leading-normal">
                    Filed by <span className="font-medium text-foreground">{selectedReport.reportedBy}</span> on {selectedReport.date}
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-4 mt-2">
                  {/* Shop & Item Metadata Blocks */}
                  <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Accused Shop:</span>
                      <span className="font-medium text-foreground">{selectedReport.shopName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Product Title:</span>
                      <span className="font-medium text-foreground">{selectedReport.reportedItem}</span>
                    </div>
                    <div className="flex justify-between border-t border-border/40 pt-2 mt-1">
                      <span className="text-muted-foreground">Report Category:</span>
                      <span className="font-medium text-rose-600 dark:text-rose-400">{selectedReport.reason}</span>
                    </div>
                  </div>

                  {/* Complaint Description Details Block */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> Buyer&apos;s Statement
                    </Label>
                    <div className="p-3.5 bg-muted/40 rounded-2xl border border-border/40 text-xs text-foreground leading-relaxed">
                      &ldquo;{selectedReport.details}&rdquo;
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTION EXECUTION ACTION FOOTER BLOCK */}
              <div className="flex flex-col gap-2 border-t border-border/40 pt-4 mt-auto w-full">
                {selectedReport.status === "Pending" ? (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleStatusChange(selectedReport.id, "Dismissed")}
                      className="flex-1 h-10 rounded-full text-xs font-medium border-border/70 text-zinc-600 gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Dismiss Case</span>
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleStatusChange(selectedReport.id, "Resolved")}
                      className="flex-1 h-10 rounded-full text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Settled</span>
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDrawerOpen(false)}
                    className="w-full h-10 rounded-full text-xs font-medium border-border/70"
                  >
                    Close Review Screen
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}