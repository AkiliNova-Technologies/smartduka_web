"use client";

import * as React from "react";
import {
  Store,
  LayoutGrid,
  Package,
  FolderTree,
  Layers,
  ShoppingBag,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  FileSearch,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { useCategories } from "@/hooks/use-categories";
import { useAdmin } from "@/hooks/use-admin";
import { Category, VendorApplicationRow } from "@/types/marketplace";
import { VerificationStatus } from "@prisma/client";

type ActiveTab = "categories" | "vendors";

const fallbackImage =
  "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=600&q=80";

const STATUS_CONFIG: Record<
  VerificationStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  PENDING: { label: "Pending", color: "text-amber-600 bg-amber-500/5 border-amber-500/10", icon: Clock },
  SUBMITTED: { label: "Submitted", color: "text-blue-600 bg-blue-500/5 border-blue-500/10", icon: FileSearch },
  UNDER_REVIEW: { label: "Under Review", color: "text-purple-600 bg-purple-500/5 border-purple-500/10", icon: FileSearch },
  APPROVED: { label: "Approved", color: "text-emerald-600 bg-emerald-500/5 border-emerald-500/10", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", color: "text-rose-600 bg-rose-500/5 border-rose-500/10", icon: XCircle },
};

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = React.useState<ActiveTab>("categories");

  const {
    categories,
    isLoading: categoriesLoading,
    error: categoriesError,
    refresh,
    deleteCategory,
  } = useCategories();

  const { vendors, vendorsLoading } = useAdmin();

  const totalCategories = categories.length;
  const totalProducts = categories.reduce((acc, cat) => acc + (cat._count?.products || 0), 0);
  const totalVendors = vendors.length;
  const pendingVendors = vendors.filter(
    (v) => v.status === "PENDING" || v.status === "SUBMITTED" || v.status === "UNDER_REVIEW",
  ).length;
  const approvedVendors = vendors.filter((v) => v.status === "APPROVED").length;

  const categoryColumns = React.useMemo<ColumnDef<Category, unknown>[]>(
    () => [
      {
        accessorKey: "image",
        header: "Photo",
        cell: ({ row }) => (
          <div className="relative size-10 rounded-xl bg-muted border border-border/40 overflow-hidden shrink-0 select-none">
            <Image src={row.original.image || fallbackImage} alt={row.original.name} fill sizes="40px" className="object-cover" />
          </div>
        ),
      },
      {
        accessorKey: "name",
        header: "Category",
        cell: ({ row }) => (
          <div className="space-y-0.5 max-w-[240px]">
            <span className="font-medium text-foreground block tracking-tight truncate">{row.original.name}</span>
          </div>
        ),
      },
      {
        accessorKey: "parentId",
        header: "Level",
        cell: ({ row }) => {
          const parent = categories.find((c) => c.id === row.original.parentId);
          return parent ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-purple-600 bg-purple-500/5 border border-purple-500/10 px-2.5 py-0.5 rounded-md">
              <FolderTree className="w-3 h-3" />Child of: {parent.name}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-500/5 border border-emerald-500/10 px-2.5 py-0.5 rounded-md">
              <Layers className="w-3 h-3" />Main Group
            </span>
          );
        },
      },
      {
        id: "productsCount",
        header: "Products",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <ShoppingBag className="w-3.5 h-3.5 stroke-[1.5]" />{row.original._count?.products ?? 0} items
          </div>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">View</div>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end">
            <Link href={`/admin/categories`} className="p-1.5 text-muted-foreground hover:text-foreground rounded-md border border-border/40 hover:bg-muted transition-colors cursor-pointer" title="Manage Categories">
              <Eye className="size-3.5" />
            </Link>
          </div>
        ),
      },
    ],
    [categories],
  );

  const vendorColumns = React.useMemo<ColumnDef<VendorApplicationRow, unknown>[]>(
    () => [
      {
        accessorKey: "storeName",
        header: "Store",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="relative size-10 rounded-xl bg-muted border border-border/40 overflow-hidden shrink-0">
              {row.original.logoUrl ? (
                <Image src={row.original.logoUrl} alt={row.original.storeName} fill sizes="40px" className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/5">
                  <Store className="w-4 h-4 text-muted-foreground/50" />
                </div>
              )}
            </div>
            <div className="space-y-0.5 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{row.original.storeName}</p>
              <p className="text-[10px] text-muted-foreground truncate">{row.original.storeSlug}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "userName",
        header: "Owner",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-foreground">{row.original.userName}</p>
            <p className="text-[10px] text-muted-foreground">{row.original.userEmail}</p>
          </div>
        ),
      },
      {
        accessorKey: "documentCount",
        header: "Docs",
        cell: ({ row }) => (
          <span className="text-xs font-medium text-muted-foreground">{row.original.documentCount} file{row.original.documentCount !== 1 ? "s" : ""}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const config = STATUS_CONFIG[row.original.status];
          const Icon = config.icon;
          return (
            <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border", config.color)}>
              <Icon className="w-3 h-3" />{config.label}
            </span>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "Applied",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">{new Date(row.original.createdAt).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" })}</span>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">View</div>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end">
            <Link href={`/admin/vendors`} className="p-1.5 text-muted-foreground hover:text-foreground rounded-md border border-border/40 hover:bg-muted transition-colors cursor-pointer" title="Manage Vendors">
              <Eye className="size-3.5" />
            </Link>
          </div>
        ),
      },
    ],
    [],
  );

  const renderTabSwitcher = (
    <div className="flex items-center gap-5 select-none">
      {[
        { id: "categories", label: "Categories", icon: LayoutGrid },
        { id: "vendors", label: "Shops & Vendors", icon: Store },
      ].map((tab) => {
        const isSelected = activeTab === tab.id;
        return (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as ActiveTab)}
            className={cn("flex items-center gap-2 py-1 text-xs sm:text-sm tracking-tight font-medium transition-all border-b-2 outline-none cursor-pointer -mb-[18px] pb-4",
              isSelected ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
            <tab.icon className="size-4" /><span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );

  if (!deleteCategory) {
    return (
      <div className="max-w-8xl mx-auto py-20 text-center">
        <p className="text-sm text-muted-foreground">Admin dashboard requires VendorCatalogProvider.</p>
      </div>
    );
  }

  return (
    <div className="max-w-8xl mx-auto space-y-8 animate-in fade-in duration-300 w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-foreground flex items-center gap-2.5">
            <span>Dashboard Overview</span>
          </h1>
          <p className="text-xs text-muted-foreground">Quick overview of your platform — categories, vendors, and store activity.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Categories", value: totalCategories, icon: LayoutGrid, desc: "All groups" },
          { label: "Total Products", value: totalProducts, icon: Package, desc: "Across all stores" },
          { label: "Total Vendors", value: totalVendors, icon: Store, desc: `${approvedVendors} approved` },
          { label: "Pending Review", value: pendingVendors, icon: Clock, desc: "Awaiting approval" },
        ].map((stat, i) => (
          <div key={i} className="bg-card text-card-foreground border border-border/60 rounded-2xl p-4 space-y-2 shadow-2xs">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</span>
              <stat.icon className="size-4 text-primary shrink-0" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-2xl font-semibold tracking-tight text-foreground">{stat.value}</h3>
              <p className="text-[11px] text-muted-foreground font-medium">{stat.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {categoriesError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-medium flex items-center justify-between">
          <span>{categoriesError}</span>
          <Button size="sm" variant="outline" onClick={refresh} className="h-7 text-xs rounded-lg">Retry</Button>
        </div>
      )}

      {activeTab === "categories" && (
        <DataTable columns={categoryColumns} data={categories} getRowId={(row) => row.id} isLoading={categoriesLoading} renderTabs={renderTabSwitcher} />
      )}

      {activeTab === "vendors" && (
        <DataTable columns={vendorColumns} data={vendors} getRowId={(row) => row.id} isLoading={vendorsLoading} renderTabs={renderTabSwitcher} />
      )}
    </div>
  );
}