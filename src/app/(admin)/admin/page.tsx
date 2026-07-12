"use client";

import * as React from "react";
import {
  Store,
  LayoutGrid,
  Package,
  Trash2,
  FolderTree,
  Layers,
  ShoppingBag,
  Eye,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { DeleteDialog } from "@/components/alert-dialog";
import { useCategories } from "@/hooks/use-categories";
import { useDeleteDialog } from "@/hooks/use-delete-dialog";
import { Category } from "@/types/marketplace";

type ActiveTab = "categories" | "vendors";


export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = React.useState<ActiveTab>("categories");

  // Use real categories from API
  const {
    categories,
    isLoading: categoriesLoading,
    error: categoriesError,
    refresh: refreshCategories,
    deleteCategory,
  } = useCategories({ mode: "flat" });

  // Delete dialog hook
  const {
    isOpen,
    isDeleting,
    itemToDelete,
    openDeleteDialog,
    closeDeleteDialog,
    handleDelete,
  } = useDeleteDialog(async (id) => {
    const result = await deleteCategory(id);
    return { 
      success: !result.error, 
      error: result.error 
    };
  });

  // Calculate stats from real data
  const totalCategories = categories.length;
  const parentCategories = categories.filter((c) => !c.parentId).length;
  const childCategories = categories.filter((c) => c.parentId).length;
  const totalProducts = categories.reduce(
    (acc, cat) => acc + (cat._count?.products || 0),
    0,
  );

  const fallbackImage =
    "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=600&q=80";

  // ==========================================
  // 1. TANSTACK COLUMN CONTRACT: CATEGORIES
  // ==========================================
  const categoryColumns = React.useMemo<ColumnDef<Category, unknown>[]>(
    () => [
      {
        accessorKey: "image",
        header: "Photo",
        cell: ({ row }) => (
          <div className="relative size-10 rounded-xl bg-muted border border-border/40 overflow-hidden shrink-0 select-none">
            <Image
              src={row.original.image || fallbackImage}
              alt={row.original.name}
              fill
              sizes="40px"
              className="object-cover"
            />
          </div>
        ),
      },
      {
        accessorKey: "name",
        header: "Category Info",
        cell: ({ row }) => (
          <div className="space-y-0.5 max-w-[240px]">
            <span className="font-medium text-foreground block tracking-tight truncate">
              {row.original.name}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
          <span className="text-[11px] text-muted-foreground text-wrap block line-clamp-1">
            {row.original.description}
          </span>
        ),
      },
      {
        accessorKey: "parentId",
        header: "Hierarchy Level",
        cell: ({ row }) => {
          const parent = categories.find((c) => c.id === row.original.parentId);
          return parent ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-purple-600 bg-purple-500/5 border border-purple-500/10 px-2.5 py-0.5 rounded-md">
              <FolderTree className="w-3 h-3" />
              <span>Child of: {parent.name}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-500/5 border border-emerald-500/10 px-2.5 py-0.5 rounded-md">
              <Layers className="w-3 h-3" />
              <span>
                Main Group ({row.original._count?.subCategories || 0} sub-items)
              </span>
            </span>
          );
        },
      },
      {
        id: "productsCount",
        header: "Total Products",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <ShoppingBag className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>{row.original._count?.products ?? 0} items</span>
          </div>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1.5">
            <Link
              href={`/admin/categories`}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-md border border-border/40 hover:bg-muted transition-colors cursor-pointer"
              title="Manage Category">
              <Eye className="size-3.5" />
            </Link>
            <button
              onClick={() => openDeleteDialog(row.original.id, {
                itemName: row.original.name,
                itemType: "category",
                title: "Delete Category",
              })}
              className="p-1.5 text-muted-foreground hover:text-rose-500 rounded-md border border-border/40 hover:bg-rose-500/5 transition-colors cursor-pointer"
              title="Delete Category">
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ),
      },
    ],
    [categories, openDeleteDialog],
  );

  // ==========================================
  // 3. RENDER SUB-ELEMENTS FOR THE DATA TABLE
  // ==========================================
  const renderTabSwitcher = (
    <div className="flex items-center gap-5 select-none">
      {[
        { id: "categories", label: "Categories", icon: LayoutGrid },
        { id: "vendors", label: "Shops & Vendors", icon: Store },
      ].map((tab) => {
        const isSelected = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ActiveTab)}
            className={cn(
              "flex items-center gap-2 py-1 text-xs sm:text-sm tracking-tight font-medium transition-all border-b-2 outline-none cursor-pointer -mb-[18px] pb-4",
              isSelected
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}>
            <tab.icon className="size-4" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="max-w-8xl mx-auto space-y-8 animate-in fade-in duration-300 w-full min-w-0">
      {/* MANAGEMENT SCREEN HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-foreground flex items-center gap-2.5">
            <span>System Administration</span>
          </h1>
          <p className="text-xs font-semibold text-muted-foreground">
            Ecosystem supervisor matrix modifying platform directories, vendor
            clearance parameters, and global taxonomy indices.
          </p>
        </div>
      </div>

      {/* OVERVIEW KPI STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            label: "Total Categories",
            value: totalCategories,
            icon: LayoutGrid,
            desc: "All taxonomy segments",
          },
          {
            label: "Parent Groups",
            value: parentCategories,
            icon: FolderTree,
            desc: "Main category groups",
          },
          {
            label: "Child Categories",
            value: childCategories,
            icon: Layers,
            desc: "Nested subcategories",
          },
          {
            label: "Total Products",
            value: totalProducts,
            icon: Package,
            desc: "Across all categories",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-card text-card-foreground border border-border/60 rounded-2xl p-5 shadow-2xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </span>
              <stat.icon className="size-4 text-primary shrink-0" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-2xl font-medium tracking-tight text-foreground">
                {stat.value}
              </h3>
              <p className="text-[11px] text-muted-foreground font-medium">
                {stat.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Error Display */}
      {categoriesError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-medium flex items-center justify-between">
          <span>{categoriesError}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={refreshCategories}
            className="h-7 text-xs rounded-lg">
            Retry
          </Button>
        </div>
      )}

      {/* CATEGORIES TABLE */}
      {activeTab === "categories" && (
        <DataTable
          columns={categoryColumns}
          data={categories}
          getRowId={(row) => row.id}
          isLoading={categoriesLoading}
          renderTabs={renderTabSwitcher}
          />
      )}

      {/* VENDORS TABLE (Placeholder) */}
      {activeTab === "vendors" && (
        <DataTable
          columns={[]}
          data={[]}
          getRowId={(row) => (row as { id: string }).id}
          renderTabs={renderTabSwitcher}
        />
      )}

      {/* Delete Dialog */}
      <DeleteDialog
        open={isOpen}
        onOpenChange={(open) => !open && closeDeleteDialog()}
        title={itemToDelete?.config.title}
        description={itemToDelete?.config.description}
        itemName={itemToDelete?.config.itemName}
        itemType={itemToDelete?.config.itemType}
        variant={itemToDelete?.config.variant}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}