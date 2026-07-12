"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, Edit2, Box, Eye, AlertCircle } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/hooks/use-products";
import { useVendor } from "@/hooks/use-vendor";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/marketplace";

interface MerchantProduct {
  id: string;
  title: string;
  brand: string;
  price: number;
  compareAtPrice?: number;
  inventoryCount?: number;
  image: string;
}

export default function VendorProductsPage() {
  // Get the real vendor profile to extract the vendor ID
  const { profile, loading: vendorLoading } = useVendor();
  const vendorId = profile?.id;

  // Only fetch products when we have a vendor ID
  const {
    products: apiProducts,
    isLoading: productsLoading,
    error,
    refresh,
  } = useProducts({
    vendorId: vendorId || "", 
  });

  // Combine loading states
  const isLoading = vendorLoading || (!!vendorId && productsLoading);

  const productsList = React.useMemo<MerchantProduct[]>(() => {
    return apiProducts.map((p: Product) => ({
      id: p.id,
      title: p.name || (p as unknown as { title?: string }).title || "",
      brand: p.brand || "",
      price: Number(p.basePrice ?? (p as unknown as { price?: number }).price ?? 0),
      compareAtPrice: p.compareAtPrice != null
        ? Number(p.compareAtPrice)
        : (p as unknown as { compareAtPrice?: number }).compareAtPrice != null
          ? Number((p as unknown as { compareAtPrice?: number }).compareAtPrice)
          : undefined,
      inventoryCount: p.inventoryCount ?? 0,
      image: p.image || (
        p.images && p.images.length > 0
          ? (typeof p.images[0] === "string"
              ? p.images[0]
              : (p.images[0] as { url: string }).url)
          : ""
      ) || "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=600&q=80",
    }));
  }, [apiProducts]);

  const tableKey = React.useMemo(
    () => productsList.map((p) => p.id).join(","),
    [productsList]
  );

  const columns = React.useMemo<ColumnDef<MerchantProduct, unknown>[]>(
    () => [
      {
        id: "preview",
        header: "Preview",
        cell: ({ row }) => {
          const product = row.original;
          return (
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted border border-border/40 relative shrink-0">
              <Image
                src={product.image}
                alt={product.title}
                fill
                sizes="40px"
                className="object-cover"
              />
            </div>
          );
        },
      },
      {
        accessorKey: "title",
        header: "Product Details",
        cell: ({ row }) => {
          const product = row.original;
          return (
            <div className="flex flex-col max-w-xs md:max-w-sm select-none">
              <span className="font-medium text-sm truncate text-foreground">
                {product.title}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                {product.brand}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "price",
        header: "Current Price",
        cell: ({ row }) => {
          const product = row.original;
          return (
            <div className="flex flex-col font-semibold">
              <span className="text-foreground">
                UGX {product.price.toLocaleString()}
              </span>
              {product.compareAtPrice && (
                <span className="text-[10px] text-muted-foreground line-through font-semibold">
                  UGX {product.compareAtPrice.toLocaleString()}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "inventoryCount",
        header: "Stock Level",
        cell: ({ row }) => {
          const product = row.original;
          const count = product.inventoryCount ?? 0;
          const isCriticalLow = count <= 5;
          return (
            <div className="flex items-center gap-1.5 select-none">
              <Box
                className={cn(
                  "w-3.5 h-3.5 text-muted-foreground",
                  isCriticalLow && "text-amber-500/80",
                )}
              />
              <span
                className={cn(
                  "font-medium",
                  isCriticalLow ? "text-amber-500" : "text-foreground",
                )}>
                {count} Units available
              </span>
            </div>
          );
        },
      },
      {
        id: "actions",
        header: () => <div className="text-center">Actions</div>,
        cell: ({ row }) => {
          const product = row.original;
          return (
            <div className="flex items-center justify-center gap-2">
              <Link
                href={`/vendor/products/${product.id}/edit`}
                className="p-2 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors active:scale-95">
                <Edit2 className="w-3.5 h-3.5" />
              </Link>
              <Link
                href={`/vendor/products/${product.id}`}
                className="p-2 rounded-lg border border-border/60 text-muted-foreground hover:text-primary hover:bg-muted transition-colors active:scale-95">
                <Eye className="w-3.5 h-3.5" />
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
            onClick={refresh}
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
              className="inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-primary text-primary-foreground text-xs font-semibold rounded-full hover:bg-emerald-600 active:scale-95 transition-all shrink-0">
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add New Listing</span>
            </Link>
          </div>
        }
      />
    </div>
  );
}