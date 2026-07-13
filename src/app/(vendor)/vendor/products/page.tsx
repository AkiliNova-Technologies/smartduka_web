"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, Edit2, Eye, AlertCircle } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/hooks/use-products";
import { useVendor } from "@/hooks/use-vendor";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/marketplace";

export default function VendorProductsPage() {
  const { profile, loading: vendorLoading } = useVendor();
  const vendorId = profile?.id;

  const {
    products: apiProducts,
    productsLoading,
    error,
    refreshProducts,
  } = useProducts();

  // Combine loading states
  const isLoading = vendorLoading || productsLoading;

  // Filter products for this vendor locally (no API call needed)
  const vendorProducts = React.useMemo(() => {
    if (!vendorId) return [];
    return apiProducts.filter((p: Product) => p.vendorId === vendorId);
  }, [apiProducts, vendorId]);

  const productsList = React.useMemo<Product[]>(() => {
    return vendorProducts.map((p: Product) => ({
      ...p,
      basePrice: Number(p.basePrice),
      compareAtPrice: p.compareAtPrice != null ? Number(p.compareAtPrice) : undefined,
      image:
        p.image ||
        (p.images && p.images.length > 0
          ? typeof p.images[0] === "string"
            ? p.images[0]
            : (p.images[0] as { url: string }).url
          : "") ||
        "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=600&q=80",
    }));
  }, [vendorProducts]);

  const tableKey = React.useMemo(
    () => productsList.map((p) => p.id).join(","),
    [productsList],
  );

  const columns = React.useMemo<ColumnDef<Product, unknown>[]>(
    () => [
      {
        id: "preview",
        header: "Image",
        size: 48,
        cell: ({ row }) => {
          const product = row.original;
          return (
            <div className="w-9 h-9 rounded-lg overflow-hidden bg-muted border border-border/40 relative shrink-0">
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="36px"
                className="object-cover"
              />
            </div>
          );
        },
      },
      {
        accessorKey: "name",
        header: "Product",
        cell: ({ row }) => {
          const product = row.original;
          return (
            <div className="flex flex-col max-w-[160px] md:max-w-[200px] select-none">
              <span className="font-medium text-sm truncate text-foreground">
                {product.name}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => {
          return (
            <div className="flex flex-col">
              <span className="font-semibold text-foreground text-sm">
                {row.original.category?.name}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "basePrice",
        header: "Price",
        cell: ({ row }) => {
          const product = row.original;
          const compareAt = product.compareAtPrice;
          const hasDiscount = compareAt && compareAt > product.basePrice;
          return (
            <div className="flex flex-col">
              <span className="font-semibold text-foreground text-sm">
                UGX {product.basePrice.toLocaleString()}
              </span>
              {hasDiscount && (
                <span className="text-[10px] text-muted-foreground line-through">
                  UGX {compareAt!.toLocaleString()}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "inventoryCount",
        header: "Stock",
        cell: ({ row }) => {
          const product = row.original;
          const count = product.inventoryCount ?? 0;
          const isLow = count > 0 && count <= 5;
          const isOut = count === 0;
          return (
            <div className="flex flex-1">
              <span
                className={cn(
                  "text-sm font-semibold text-center pl-4",
                  isOut
                    ? "text-rose-500"
                    : isLow
                      ? "text-amber-500"
                      : "text-foreground",
                )}
              >
                {isOut ? "—" : count}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const product = row.original;
          const status = product.status || "DRAFT";
          const config: Record<string, { label: string; className: string }> = {
            PUBLISHED: {
              label: "Published",
              className: "bg-emerald-500/5 text-emerald-600 border-emerald-500/20",
            },
            ACTIVE: {
              label: "Active",
              className: "bg-emerald-500/5 text-emerald-600 border-emerald-500/20",
            },
            DRAFT: {
              label: "Draft",
              className: "bg-muted text-muted-foreground border-border/40",
            },
            ARCHIVED: {
              label: "Archived",
              className: "bg-muted text-muted-foreground/50 border-border/30",
            },
            OUT_OF_STOCK: {
              label: "Sold out",
              className: "bg-rose-500/5 text-rose-500 border-rose-500/20",
            },
          };
          const { label, className } = config[status] || config.DRAFT;
          return (
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border",
                className,
              )}
            >
              {label}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const product = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <Link
                href={`/vendor/products/${product.id}`}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors active:scale-95"
                title="View details"
              >
                <Eye className="w-3.5 h-3.5" />
              </Link>
              <Link
                href={`/vendor/products/${product.id}/edit`}
                className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors active:scale-95"
                title="Edit product"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </Link>
            </div>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5 select-none">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Stock & Catalog Inventory
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Modify available store lines, update marketplace pricing metrics,
            and track item balances.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={refreshProducts}
            className="h-7 text-xs rounded-lg"
          >
            Retry
          </Button>
        </div>
      )}

      <DataTable
        key={tableKey}
        columns={columns}
        data={productsList}
        getRowId={(product) => product.id}
        isLoading={isLoading}
        renderTabs={
          <div className="flex items-center select-none">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
              Active Catalog Stack ({productsList.length})
            </span>
          </div>
        }
        toolbarActions={
          <div className="flex items-center gap-2">
            <Link
              href="/vendor/products/new"
              className="inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-primary text-primary-foreground text-xs font-semibold rounded-full hover:bg-emerald-600 active:scale-95 transition-all shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add New Listing</span>
            </Link>
          </div>
        }
      />
    </div>
  );
}