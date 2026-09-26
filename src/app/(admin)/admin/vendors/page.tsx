"use client";

import * as React from "react";
import {
  Search,
  Eye,
  MoreVertical,
  Ban,
  CheckCircle2,
  XCircle,
  Clock,
  FileSearch,
  Mail,
  Phone,
  MapPin,
  Loader2,
  Store,
  FileText,
  Download,
} from "lucide-react";
import Image from "next/image";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VerificationStatus } from "@prisma/client";
import { useAdmin } from "@/hooks/use-admin";
import { verifyVendorAction } from "@/actions/admin";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import type { VendorApplicationRow } from "@/types/marketplace";


const STATUS_CONFIG: Record<
  VerificationStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  PENDING: {
    label: "Pending",
    color: "text-amber-600 bg-amber-500/5 border-amber-500/10",
    icon: Clock,
  },
  SUBMITTED: {
    label: "Submitted",
    color: "text-blue-600 bg-blue-500/5 border-blue-500/10",
    icon: FileSearch,
  },
  UNDER_REVIEW: {
    label: "Under Review",
    color: "text-purple-600 bg-purple-500/5 border-purple-500/10",
    icon: FileSearch,
  },
  APPROVED: {
    label: "Approved",
    color: "text-emerald-600 bg-emerald-500/5 border-emerald-500/10",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Rejected",
    color: "text-rose-600 bg-rose-500/5 border-rose-500/10",
    icon: XCircle,
  },
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  NATIONAL_ID: "National ID",
  PASSPORT: "Passport",
  BUSINESS_REGISTRATION: "Business Registration",
  TAX_CERTIFICATE: "Tax Certificate",
  TRADING_LICENSE: "Trading License",
  OTHER: "Other Document",
};

function VendorsSkeleton() {
  return (
    <div className="w-full space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-7 w-48 rounded-md" />
        <Skeleton className="h-3 w-72 rounded-md" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}

export default function AdminVendorsPage() {
  const {
    vendors: applications,
    vendorsLoading: loading,
    refreshVendors,
  } = useAdmin();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<
    VerificationStatus | "ALL"
  >("ALL");
  const [selectedApp, setSelectedApp] =
    React.useState<VendorApplicationRow | null>(null);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  const filteredApplications = React.useMemo(() => {
    let result = applications;
    if (statusFilter !== "ALL")
      result = result.filter((a) => a.status === statusFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.storeName.toLowerCase().includes(q) ||
          a.storeSlug.toLowerCase().includes(q) ||
          a.userEmail.toLowerCase().includes(q),
      );
    }
    return result;
  }, [applications, searchQuery, statusFilter]);

  const totalPending = applications.filter(
    (a) =>
      a.status === "PENDING" ||
      a.status === "SUBMITTED" ||
      a.status === "UNDER_REVIEW",
  ).length;
  const totalApproved = applications.filter(
    (a) => a.status === "APPROVED",
  ).length;
  const totalRejected = applications.filter(
    (a) => a.status === "REJECTED",
  ).length;

  const handleVerify = async (id: string, status: VerificationStatus) => {
    setActionLoading(id);
    try {
      const result = await verifyVendorAction(
        id,
        status,
        status === "APPROVED" ? "Approved by admin." : "Rejected by admin.",
      );
      if (result.success) {
        toast.success(
          status === "APPROVED"
            ? "Store approved successfully!"
            : "Application rejected.",
        );
        refreshVendors();
      } else {
        toast.error(result.error || "Failed to update application");
      }
    } catch {
      toast.error("Failed to update application");
    } finally {
      setActionLoading(null);
    }
  };

  const columns = React.useMemo<ColumnDef<VendorApplicationRow, unknown>[]>(
    () => [
      {
        accessorKey: "storeName",
        header: "Store",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="relative size-10 rounded-xl bg-muted border border-border/40 overflow-hidden shrink-0">
              {row.original.logoUrl ? (
                <Image
                  src={row.original.logoUrl}
                  alt={row.original.storeName}
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/5">
                  <Store className="w-4 h-4 text-muted-foreground/50" />
                </div>
              )}
            </div>
            <div className="space-y-0.5 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {row.original.storeName}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {row.original.storeSlug}
              </p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "userName",
        header: "Owner",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-foreground">
              {row.original.userName}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {row.original.userEmail}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "documentCount",
        header: "Docs",
        cell: ({ row }) => (
          <span className="text-xs font-medium text-muted-foreground">
            {row.original.documentCount} file
            {row.original.documentCount !== 1 ? "s" : ""}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const config = STATUS_CONFIG[row.original.status];
          const Icon = config.icon;
          return (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border",
                config.color,
              )}>
              <Icon className="w-3 h-3" />
              {config.label}
            </span>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "Applied",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {new Date(row.original.createdAt).toLocaleDateString("en-UG", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const isPending =
            row.original.status === "PENDING" ||
            row.original.status === "SUBMITTED" ||
            row.original.status === "UNDER_REVIEW";
          const isLoading = actionLoading === row.original.id;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <button
                onClick={() => setSelectedApp(row.original)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg border border-border/40 hover:bg-muted transition-colors cursor-pointer"
                title="View details">
                <Eye className="w-3.5 h-3.5" />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isLoading}
                    className="size-7 border border-border/40 rounded-lg text-muted-foreground cursor-pointer">
                    {isLoading ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <MoreVertical className="size-3.5" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-44 rounded-xl border border-border/60 p-1 text-xs font-medium">
                  {isPending && (
                    <>
                      <DropdownMenuItem
                        onClick={() =>
                          handleVerify(row.original.id, "APPROVED")
                        }
                        disabled={!!actionLoading}
                        className="rounded-lg py-2 px-2.5 text-xs flex items-center gap-2 cursor-pointer text-emerald-600 focus:bg-emerald-500/5">
                        <CheckCircle2 className="size-3.5" />
                        Approve Store
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          handleVerify(row.original.id, "REJECTED")
                        }
                        disabled={!!actionLoading}
                        className="rounded-lg py-2 px-2.5 text-xs flex items-center gap-2 cursor-pointer text-rose-600 focus:bg-rose-500/5">
                        <XCircle className="size-3.5" />
                        Reject
                      </DropdownMenuItem>
                    </>
                  )}
                  {row.original.status === "APPROVED" && (
                    <DropdownMenuItem
                      onClick={() => handleVerify(row.original.id, "REJECTED")}
                      disabled={!!actionLoading}
                      className="rounded-lg py-2 px-2.5 text-xs flex items-center gap-2 cursor-pointer text-amber-600 focus:bg-amber-500/5">
                      <Ban className="size-3.5" />
                      Suspend Store
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-border/40 my-1" />
                  <DropdownMenuItem
                    onClick={() => setSelectedApp(row.original)}
                    className="rounded-lg py-2 px-2.5 text-xs flex items-center gap-2 cursor-pointer">
                    <Eye className="size-3.5" />
                    View Details
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [actionLoading],
  );

  if (loading && applications.length === 0) return <VendorsSkeleton />;

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      <div className="space-y-1 select-none">
        <h2 className="text-xl font-medium tracking-tight text-foreground">
          Vendor Applications
        </h2>
        <p className="text-xs text-muted-foreground">
          Review documents, verify stores, and manage vendor applications.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 select-none">
        {[
          {
            label: "Pending Review",
            value: totalPending,
            icon: Clock,
            style: "bg-card border-border/60 text-amber-600",
          },
          {
            label: "Approved Stores",
            value: totalApproved,
            icon: CheckCircle2,
            style: "bg-card border-border/60 text-emerald-600",
          },
          {
            label: "Rejected",
            value: totalRejected,
            icon: XCircle,
            style: "bg-card border-border/60 text-rose-600",
          },
        ].map((kpi, idx) => (
          <div
            key={idx}
            className={cn(
              "border rounded-2xl p-4 flex items-center justify-between shadow-2xs",
              kpi.style,
            )}>
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {kpi.label}
              </span>
              <h3 className="text-2xl font-medium text-foreground tracking-tight">
                {loading ? "—" : kpi.value}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-muted/60 border border-border/40">
              <kpi.icon className="w-4 h-4" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {(
          [
            "ALL",
            "PENDING",
            "SUBMITTED",
            "UNDER_REVIEW",
            "APPROVED",
            "REJECTED",
          ] as const
        ).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={cn(
              "px-3 py-1.5 rounded-full text-[10px] font-semibold border transition-all cursor-pointer",
              statusFilter === status
                ? "bg-primary text-white border-primary"
                : "bg-card text-muted-foreground border-border/60 hover:border-primary/30",
            )}>
            {status === "ALL"
              ? "All"
              : STATUS_CONFIG[status as VerificationStatus]?.label || status}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filteredApplications}
        getRowId={(row) => row.id}
        isLoading={loading}
        renderTabs={
          <div className="flex items-center gap-3 w-full max-w-xs relative group">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search stores or owners..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 border-border/60 rounded-full bg-muted/20 placeholder:text-muted-foreground/40 text-xs focus-visible:ring-primary/20"
            />
          </div>
        }
      />

      {/* Detail Sheet with Documents */}
      <Sheet
        open={!!selectedApp}
        onOpenChange={(open) => !open && setSelectedApp(null)}>
        {selectedApp && (
          <SheetContent
            side="right"
            className="w-full sm:max-w-md bg-card border-l border-border/60 p-6 overflow-y-auto">
            <SheetHeader className="text-left px-0">
              <SheetTitle className="text-base font-medium">
                {selectedApp.storeName}
              </SheetTitle>
              <SheetDescription className="text-xs font-mono text-muted-foreground">
                Application ID: {selectedApp.id}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-5 mt-6">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Status</span>
                {(() => {
                  const config = STATUS_CONFIG[selectedApp.status];
                  const Icon = config.icon;
                  return (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border",
                        config.color,
                      )}>
                      <Icon className="w-3 h-3" />
                      {config.label}
                    </span>
                  );
                })()}
              </div>

              <div className="border-t border-border/40 pt-4 space-y-3">
                <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Owner
                </h4>
                <p className="text-sm font-medium">{selectedApp.userName}</p>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3 h-3" />
                    {selectedApp.userEmail}
                  </div>
                  {selectedApp.businessPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3" />
                      {selectedApp.businessPhone}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-border/40 pt-4 space-y-3">
                <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Business Details
                </h4>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p>
                    <strong className="text-foreground">Type:</strong>{" "}
                    {selectedApp.businessType}
                  </p>
                  <p>
                    <strong className="text-foreground">Slug:</strong>{" "}
                    {selectedApp.storeSlug}
                  </p>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                    {selectedApp.streetAddress}, {selectedApp.city}
                    {selectedApp.district ? `, ${selectedApp.district}` : ""}
                  </div>
                  <p>
                    <strong className="text-foreground">Physical Store:</strong>{" "}
                    {selectedApp.hasPhysicalStore ? "Yes" : "No"}
                  </p>
                </div>
              </div>

              {/* Documents Section */}
              <div className="border-t border-border/40 pt-4 space-y-3">
                <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  Verification Documents ({selectedApp.documents?.length || 0})
                </h4>
                {selectedApp.documents && selectedApp.documents.length > 0 ? (
                  <div className="space-y-2">
                    {selectedApp.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 bg-muted/30 border border-border/40 rounded-xl">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-primary/5 border border-border/40 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">
                              {doc.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {DOCUMENT_TYPE_LABELS[doc.type] || doc.type}
                            </p>
                          </div>
                        </div>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors shrink-0"
                          title="View document">
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No documents uploaded yet.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-border/40 pt-4 mt-6">
              {(selectedApp.status === "PENDING" ||
                selectedApp.status === "SUBMITTED" ||
                selectedApp.status === "UNDER_REVIEW") && (
                <>
                  <Button
                    onClick={() => handleVerify(selectedApp.id, "APPROVED")}
                    disabled={actionLoading === selectedApp.id}
                    className="w-full h-10 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer">
                    {actionLoading === selectedApp.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    Approve Store
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleVerify(selectedApp.id, "REJECTED")}
                    disabled={actionLoading === selectedApp.id}
                    className="w-full h-10 rounded-xl text-xs font-medium cursor-pointer">
                    <XCircle className="w-3.5 h-3.5" />
                    Reject Application
                  </Button>
                </>
              )}
              <Button
                variant="secondary"
                onClick={() => setSelectedApp(null)}
                className="w-full h-10 rounded-xl text-xs font-medium border cursor-pointer">
                Close
              </Button>
            </div>
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}
