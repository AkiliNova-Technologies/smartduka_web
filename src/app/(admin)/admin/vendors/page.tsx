"use client";

import * as React from "react";
import Link from "next/link";
import {
  Eye,
  MoreVertical,
  Ban,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  Phone,
  Loader2,
  FileText,
  Download,
  RotateCcw,
  ShieldX,
  ExternalLink,
} from "lucide-react";
import { MediaImage } from "@/components/marketplace/media-image";
import { SHOP_LOGO_FALLBACK } from "@/lib/media";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DataTable } from "@/components/data-table";
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
import { useAdmin } from "@/hooks/use-admin";
import { moderateShopAction } from "@/actions/admin";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminMetricCard } from "@/components/admin/admin-metric-card";
import type { VendorApplicationRow } from "@/types/marketplace";
import type {
  ShopModerationAction,
  ShopModerationState,
} from "@/lib/shop-moderation-state";
import { useAdminVendorVerificationDetails } from "@/hooks/use-admin-vendor-verification-details";
import { ShopVerificationStatusBadge } from "@/components/marketplace/shop-verification-status-badge";
import { StatusBadge } from "@/components/marketplace/status-badge";
import { DataTableStatusFilter } from "@/components/data-table-status-filter";
import { ShopModerationDialog } from "@/components/admin/shop-moderation-dialog";

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

  const [statusFilter, setStatusFilter] = React.useState<
    ShopModerationState | "ALL"
  >("ALL");
  const [selectedApp, setSelectedApp] =
    React.useState<VendorApplicationRow | null>(null);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [moderationRequest, setModerationRequest] = React.useState<{ shop: VendorApplicationRow; action: ShopModerationAction } | null>(null);
  const verification = useAdminVendorVerificationDetails(
    selectedApp?.id ?? null,
  );

  const openDetails = React.useCallback((application: VendorApplicationRow) => {
    setSelectedApp(application);
    const url = new URL(window.location.href);
    url.searchParams.set("applicationId", application.id);
    window.history.replaceState(null, "", url);
  }, []);
  const closeDetails = React.useCallback(() => {
    setSelectedApp(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("applicationId");
    window.history.replaceState(null, "", url);
  }, []);

  React.useEffect(() => {
    if (selectedApp || applications.length === 0) return;
    const applicationId = new URL(window.location.href).searchParams.get(
      "applicationId",
    );
    const application = applications.find((item) => item.id === applicationId);
    if (!application) return;
    const task = window.setTimeout(() => setSelectedApp(application), 0);
    return () => window.clearTimeout(task);
  }, [applications, selectedApp]);

  const filteredApplications = React.useMemo(() => {
    let result = applications;
    if (statusFilter !== "ALL")
      result = result.filter((a) => a.status === statusFilter);
    return result;
  }, [applications, statusFilter]);

  const totalPending = applications.filter(
    (a) => a.status === "PENDING",
  ).length;
  const totalApproved = applications.filter(
    (a) => a.status === "APPROVED",
  ).length;
  const totalRejected = applications.filter(
    (a) => a.status === "REJECTED",
  ).length;

  const handleModerate = React.useCallback(
    async (id: string, action: ShopModerationAction) => {
      setActionLoading(id);
      try {
        const result = await moderateShopAction(id, action);
        if (result.success) {
          toast.success(
            {
              APPROVE: "Store approved.",
              REJECT: "Application rejected.",
              SUSPEND: "Store suspended.",
              RESTORE: "Store restored.",
              BAN: "Store banned.",
            }[action],
          );
          closeDetails();
          refreshVendors();
        } else {
          toast.error(result.error || "Failed to update application");
        }
      } catch {
        toast.error("Failed to update application");
      } finally {
        setActionLoading(null);
      }
    },
    [closeDetails, refreshVendors],
  );
  const openModeration = React.useCallback((shop: VendorApplicationRow, action: ShopModerationAction) => setModerationRequest({ shop, action }), []);
  const moderationSucceeded = React.useCallback((action: ShopModerationAction) => {
    toast.success({ REJECT: "Application rejected.", SUSPEND: "Store suspended.", RESTORE: "Store restored.", BAN: "Store banned.", APPROVE: "Store approved." }[action]);
    closeDetails();
    refreshVendors();
  }, [closeDetails, refreshVendors]);

  const columns = React.useMemo<ColumnDef<VendorApplicationRow, unknown>[]>(
    () => [
      {
        accessorKey: "storeName",
        header: "Store",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="relative size-10 rounded-lg bg-muted border border-border/40 overflow-hidden shrink-0">
              <MediaImage
                src={row.original.logoUrl}
                fallback={SHOP_LOGO_FALLBACK}
                alt={row.original.storeName}
                fill
                sizes="40px"
                className="object-cover"
                fallbackClassName="object-cover"
              />
            </div>
            <div className="space-y-0.5 min-w-0">
              <p
                className="line-clamp-2 text-sm font-semibold text-foreground"
                title={row.original.storeName}>
                {row.original.storeName}
              </p>
              <p
                className="truncate text-[10px] text-muted-foreground"
                title={row.original.storeSlug}>
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
            <p
              className="truncate text-[10px] text-muted-foreground"
              title={row.original.userEmail}>
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
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
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
          const isPending = row.original.status === "PENDING";
          const isLoading = actionLoading === row.original.id;
          return (
            <TooltipProvider><div className="flex items-center justify-end gap-1.5">
              <Tooltip><TooltipTrigger asChild><button aria-label="View details" onClick={() => openDetails(row.original)} className="grid size-8 shrink-0 place-items-center rounded-full border border-border/40 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Eye aria-hidden="true" className="size-3.5" /></button></TooltipTrigger><TooltipContent side="top" sideOffset={6}>View details</TooltipContent></Tooltip>
              <DropdownMenu>
                <Tooltip><TooltipTrigger asChild><DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={isLoading}
                    aria-label="More options"
                    className="size-8 shrink-0 rounded-full border-border/40 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground">
                    {isLoading ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <MoreVertical className="size-3.5" />
                    )}
                  </Button>
                </DropdownMenuTrigger></TooltipTrigger><TooltipContent side="top" sideOffset={6}>More options</TooltipContent></Tooltip>
                <DropdownMenuContent
                  align="end"
                  className="w-44 rounded-xl border border-border/60 p-1 text-xs font-medium">
                  {isPending && (
                    <>
                      <DropdownMenuItem
                        onClick={() =>
                          handleModerate(row.original.id, "APPROVE")
                        }
                        disabled={!!actionLoading}
                        className="rounded-lg py-2 px-2.5 text-xs flex items-center gap-2 cursor-pointer text-emerald-600 focus:bg-emerald-500/5">
                        <CheckCircle2 className="size-3.5" />
                        Approve Store
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          openModeration(row.original, "REJECT")
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
                      onClick={() => openModeration(row.original, "SUSPEND")}
                      disabled={!!actionLoading}
                      className="rounded-lg py-2 px-2.5 text-xs flex items-center gap-2 cursor-pointer text-amber-600 focus:bg-amber-500/5">
                      <Ban className="size-3.5" />
                      Suspend Store
                    </DropdownMenuItem>
                  )}
                  {row.original.status === "APPROVED" && (
                    <DropdownMenuItem
                      onClick={() => openModeration(row.original, "BAN")}
                      disabled={!!actionLoading}
                      className="rounded-lg py-2 px-2.5 text-xs flex items-center gap-2 cursor-pointer text-rose-700">
                      <ShieldX className="size-3.5" /> Ban Store
                    </DropdownMenuItem>
                  )}
                  {row.original.status === "SUSPENDED" && (
                    <>
                      <DropdownMenuItem
                        onClick={() =>
                          openModeration(row.original, "RESTORE")
                        }
                        disabled={!!actionLoading}
                        className="rounded-lg py-2 px-2.5 text-xs flex items-center gap-2 cursor-pointer text-emerald-600">
                        <RotateCcw className="size-3.5" /> Restore Store
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openModeration(row.original, "BAN")}
                        disabled={!!actionLoading}
                        className="rounded-lg py-2 px-2.5 text-xs flex items-center gap-2 cursor-pointer text-rose-700">
                        <ShieldX className="size-3.5" /> Ban Store
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator className="bg-border/40 my-1" />
                  <DropdownMenuItem
                    onClick={() => openDetails(row.original)}
                    className="rounded-lg py-2 px-2.5 text-xs flex items-center gap-2 cursor-pointer">
                    <Eye className="size-3.5" />
                    View Details
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div></TooltipProvider>
          );
        },
      },
    ],
    [actionLoading, handleModerate, openDetails, openModeration],
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AdminMetricCard
          label="Pending Review"
          value={loading ? "—" : totalPending}
          icon={Clock}
          tone="warning"
        />
        <AdminMetricCard
          label="Approved Stores"
          value={loading ? "—" : totalApproved}
          icon={CheckCircle2}
        />
        <AdminMetricCard
          label="Rejected"
          value={loading ? "—" : totalRejected}
          icon={XCircle}
          tone="danger"
        />
      </div>

      <DataTableStatusFilter
        value={statusFilter}
        onValueChange={setStatusFilter}
        options={([
          ["ALL", "All statuses"],
          ["PENDING", "Pending"],
          ["APPROVED", "Approved"],
          ["REJECTED", "Rejected"],
          ["SUSPENDED", "Suspended"],
          ["BANNED", "Banned"],
        ] as const).map(([value, label]) => ({ value, label }))}
      />

      <DataTable
        columns={columns}
        data={filteredApplications}
        getRowId={(row) => row.id}
        isLoading={loading}
        features={{ search: true }}
        searchPlaceholder="Search vendors..."
        getSearchText={(vendor) =>
          [vendor.storeName, vendor.storeSlug, vendor.userEmail]
            .filter(Boolean)
            .join(" ")
        }
      />

      {/* Detail Sheet with Documents */}
      <Sheet
        open={!!selectedApp}
        onOpenChange={(open) => !open && closeDetails()}>
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
                <StatusBadge status={selectedApp.status} />
              </div>
              {selectedApp.moderationReason && (
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs">
                  <p className="font-semibold text-foreground">
                    Moderation reason
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                    {selectedApp.moderationReason}
                  </p>
                </div>
              )}

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
                  <div className="flex items-start gap-1">
                    <strong className="text-foreground">Location:</strong>{" "}
                    {selectedApp.streetAddress}, {selectedApp.city}
                    {selectedApp.district ? `, ${selectedApp.district}` : ""}
                  </div>
                  <p>
                    <strong className="text-foreground">Physical Store:</strong>{" "}
                    {selectedApp.hasPhysicalStore ? "Yes" : "No"}
                  </p>
                </div>
              </div>

              {/* Documents & Verification Section */}
              <div className="border-t border-border/40 pt-4 space-y-3">
                <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  Documents &amp; Verification
                </h4>
                {verification.loading && (
                  <Skeleton className="h-28 rounded-xl" />
                )}
                {verification.error && (
                  <p role="alert" className="text-xs text-destructive">
                    {verification.error}
                  </p>
                )}
                {verification.data && (
                  <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 p-3">
                    <div>
                      <p className="text-xs font-medium">Shop verification</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {verification.data.applications.length} application
                        {verification.data.applications.length === 1 ? "" : "s"}{" "}
                        on record
                      </p>
                    </div>
                    <ShopVerificationStatusBadge
                      status={verification.data.verificationStatus}
                    />
                  </div>
                )}
                {verification.loading && (
                  <div className="space-y-2" aria-hidden="true">
                    {Array.from({ length: 2 }).map((_, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 rounded-xl border border-border/40 bg-card p-3">
                        <Skeleton className="size-9 shrink-0 rounded-lg" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-3 w-2/3" />
                          <Skeleton className="h-2.5 w-1/3" />
                          <Skeleton className="h-2.5 w-1/2" />
                        </div>
                        <Skeleton className="size-7 shrink-0 rounded-lg" />
                      </div>
                    ))}
                  </div>
                )}
                {verification.data?.applications[0] && (
                  <Link
                    href={`/admin/verifications/${verification.data.applications[0].id}`}
                    className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs font-medium text-primary hover:bg-primary/10">
                    Open latest verification application{" "}
                    <ExternalLink className="size-3.5" />
                  </Link>
                )}
                {!verification.loading && verification.data?.documents.length ? (
                  <div className="space-y-2">
                    {verification.data.documents.map((doc) => (
                      <div
                        key={`${doc.source}-${doc.id}`}
                        className="p-3 bg-muted/30 border border-border/40 rounded-xl">
                        <div className="flex items-center justify-between gap-3">
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
                              <p className="text-[10px] text-muted-foreground">
                                Uploaded{" "}
                                {new Date(doc.uploadedAt).toLocaleString(
                                  "en-UG",
                                  { dateStyle: "medium", timeStyle: "short" },
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <a
                              href={doc.viewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                              title="Secure preview">
                              <Eye className="size-3.5" />
                            </a>
                            <a
                              href={doc.downloadUrl}
                              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                              title="Secure download">
                              <Download className="size-3.5" />
                            </a>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] uppercase tracking-wide text-muted-foreground">
                          <span className="rounded-full bg-background px-2 py-0.5">
                            {doc.source === "profile"
                              ? "Shop document"
                              : "Onboarding"}
                          </span>
                          <span className="rounded-full bg-background px-2 py-0.5">
                            {doc.status.replaceAll("_", " ")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !verification.loading ? (
                  <p className="text-xs text-muted-foreground italic">
                    No documents uploaded yet.
                  </p>
                ) : null}
                {!!verification.data?.applications.length && (
                  <div className="space-y-2 pt-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Application history
                    </p>
                    {verification.data.applications.map((application) => (
                      <Link
                        key={application.id}
                        href={`/admin/verifications/${application.id}`}
                        className="block rounded-xl border border-border/40 p-3 hover:bg-muted/30">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px]">
                            {application.publicId}
                          </span>
                          <ShopVerificationStatusBadge
                            status={application.status}
                          />
                        </div>
                        <p className="mt-2 text-[10px] text-muted-foreground">
                          Submitted{" "}
                          {new Date(application.submittedAt).toLocaleString(
                            "en-UG",
                            { dateStyle: "medium", timeStyle: "short" },
                          )}{" "}
                          · {application.documentCount} document
                          {application.documentCount === 1 ? "" : "s"}
                        </p>
                        {application.decidedAt && (
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            Decided{" "}
                            {new Date(application.decidedAt).toLocaleString(
                              "en-UG",
                              { dateStyle: "medium", timeStyle: "short" },
                            )}
                            {application.decisionBy
                              ? ` by ${application.decisionBy}`
                              : ""}
                          </p>
                        )}
                        {application.rejectionReason && (
                          <p className="mt-2 text-[10px] text-rose-600">
                            {application.rejectionReason}
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-border/40 pt-4 mt-6">
              {selectedApp.status === "PENDING" && (
                <>
                  <Button
                    onClick={() => handleModerate(selectedApp.id, "APPROVE")}
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
                    onClick={() => openModeration(selectedApp, "REJECT")}
                    disabled={actionLoading === selectedApp.id}
                    className="w-full h-10 rounded-xl text-xs font-medium cursor-pointer">
                    <XCircle className="w-3.5 h-3.5" />
                    Reject Application
                  </Button>
                </>
              )}
              {selectedApp.status === "APPROVED" && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => openModeration(selectedApp, "SUSPEND")}
                    disabled={actionLoading === selectedApp.id}>
                    <Ban className="size-3.5" /> Suspend Store
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => openModeration(selectedApp, "BAN")}
                    disabled={actionLoading === selectedApp.id}>
                    <ShieldX className="size-3.5" /> Ban Store
                  </Button>
                </>
              )}
              {selectedApp.status === "SUSPENDED" && (
                <>
                  <Button
                    onClick={() => openModeration(selectedApp, "RESTORE")}
                    disabled={actionLoading === selectedApp.id}>
                    <RotateCcw className="size-3.5" /> Restore Store
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => openModeration(selectedApp, "BAN")}
                    disabled={actionLoading === selectedApp.id}>
                    <ShieldX className="size-3.5" /> Ban Store
                  </Button>
                </>
              )}
              <Button
                variant="secondary"
                onClick={closeDetails}
                className="w-full h-10 rounded-xl text-xs font-medium border cursor-pointer">
                Close
              </Button>
            </div>
          </SheetContent>
        )}
      </Sheet>
      <ShopModerationDialog shop={moderationRequest?.shop ?? null} action={moderationRequest?.action ?? null} open={!!moderationRequest} onOpenChange={(open) => !open && setModerationRequest(null)} onSuccess={moderationSucceeded}/>
    </div>
  );
}
