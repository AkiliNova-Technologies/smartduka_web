"use client";

import * as React from "react";
import { Store, Search, Boxes, EyeOff, Eye, Package } from "lucide-react";
import Image from "next/image";
import { type ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { DataTable } from "@/components/data-table";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useProducts } from "@/hooks/use-products";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product } from "@/types/marketplace";

function ProductsSkeleton() {
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

function getProductImage(product: Product): string {
  if (product.image) return product.image;
  if (product.images && product.images.length > 0) {
    const first = product.images[0];
    return typeof first === "string" ? first : first.url || "";
  }
  return "";
}

export default function AdminProductsPage() {
  const { products, isLoading, error } = useProducts();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(
    null,
  );

  const filteredProducts = React.useMemo(() => {
    if (!searchQuery) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        (p.brand ?? "").toLowerCase().includes(q) ||
        (p.vendor?.storeName ?? "").toLowerCase().includes(q),
    );
  }, [products, searchQuery]);

  const totalProducts = products.length;
  const publishedProducts = products.filter(
    (p) => p.status === "PUBLISHED" || p.status === "ACTIVE",
  ).length;
  const draftProducts = products.filter((p) => p.status === "DRAFT").length;

  const columns = React.useMemo<ColumnDef<Product, unknown>[]>(
    () => [
      {
        accessorKey: "image",
        header: "Photo",
        cell: ({ row }) => {
          const imgUrl = getProductImage(row.original);
          return (
            <div className="relative size-10 rounded-xl bg-muted border border-border/40 overflow-hidden shrink-0">
              {imgUrl ? (
                <Image
                  src={imgUrl}
                  alt={row.original.name}
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <Package className="w-4 h-4 text-muted-foreground/40" />
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "name",
        header: "Product",
        cell: ({ row }) => (
          <div className="space-y-0.5 max-w-[220px]">
            <button
              onClick={() => setSelectedProduct(row.original)}
              className="font-medium text-foreground text-left truncate hover:text-primary transition-colors cursor-pointer text-sm">
              {row.original.name}
            </button>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="uppercase tracking-wider">
                {row.original.brand || "No brand"}
              </span>
              <span>•</span>
              <span className="font-mono">
                {row.original.sku || row.original.id?.slice(0, 8)}
              </span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "vendor",
        header: "Store",
        cell: ({ row }) => (
          <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5 text-muted-foreground" />
            {row.original.vendor?.storeName || "Unknown store"}
          </span>
        ),
      },
      {
        accessorKey: "basePrice",
        header: "Price",
        cell: ({ row }) => (
          <span className="text-xs font-medium text-foreground">
            UGX {row.original.basePrice.toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-medium px-2.5 py-0.5 rounded-full border",
                status === "ACTIVE" || status === "PUBLISHED"
                  ? "text-emerald-600 bg-emerald-500/5 border-emerald-500/10"
                  : status === "DRAFT"
                    ? "text-amber-600 bg-amber-500/5 border-amber-500/10"
                    : "text-zinc-500 bg-zinc-500/5 border-zinc-500/10",
              )}>
              {status || "Unknown"}
            </span>
          );
        },
      },
      {
        accessorKey: "inventoryCount",
        header: "Stock",
        cell: ({ row }) => (
          <span
            className={cn(
              "text-xs font-medium",
              row.original.inventoryCount === 0
                ? "text-rose-500"
                : row.original.inventoryCount <= 5
                  ? "text-amber-500"
                  : "text-foreground",
            )}>
            {row.original.inventoryCount ?? 0} units
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">View</div>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end">
            <button
              onClick={() => setSelectedProduct(row.original)}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg border border-border/40 hover:bg-muted transition-colors cursor-pointer"
              title="View product details">
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  if (isLoading && products.length === 0) return <ProductsSkeleton />;

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      <div className="space-y-1 select-none">
        <h2 className="text-xl font-medium tracking-tight text-foreground flex items-center gap-2">
          <Package className="w-5 h-5" />
          All Products
        </h2>
        <p className="text-xs text-muted-foreground">
          View every product listed across all vendor stores. Use search to find
          specific items by name, brand, or store.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 select-none">
        {[
          {
            label: "Total Products",
            value: totalProducts,
            icon: Boxes,
            color: "text-blue-600",
          },
          {
            label: "Published",
            value: publishedProducts,
            icon: Eye,
            color: "text-emerald-600",
          },
          {
            label: "Drafts",
            value: draftProducts,
            icon: EyeOff,
            color: "text-amber-600",
          },
        ].map((kpi, idx) => (
          <div
            key={idx}
            className="bg-card border border-border/60 rounded-2xl p-4 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                {kpi.label}
              </span>
              <kpi.icon className={cn("w-4 h-4", kpi.color)} />
            </div>
            <p className="text-2xl font-semibold text-foreground tracking-tight">
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-medium">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        data={filteredProducts}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        renderTabs={
          <div className="flex items-center gap-3 w-full max-w-xs relative group">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search by name, brand, or store..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 border-border/60 rounded-full bg-muted/20 placeholder:text-muted-foreground/40 text-xs focus-visible:ring-primary/20"
            />
          </div>
        }
      />

      <Sheet
        open={!!selectedProduct}
        onOpenChange={(open) => !open && setSelectedProduct(null)}>
        {selectedProduct && (
          <SheetContent
            side="right"
            className="w-full sm:max-w-md bg-card border-l border-border/60 p-6 overflow-y-auto">
            <SheetHeader className="text-left px-0">
              <SheetTitle className="text-base font-medium">
                {selectedProduct.name}
              </SheetTitle>
              <SheetDescription className="text-xs font-mono text-muted-foreground">
                ID: {selectedProduct.id}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-5 mt-6">
              <div className="relative w-full aspect-square max-w-[280px] mx-auto rounded-2xl bg-muted border border-border/40 overflow-hidden">
                {(() => {
                  const imgUrl = getProductImage(selectedProduct);
                  return (
                    <div className="relative w-full aspect-square max-w-[280px] mx-auto rounded-2xl bg-muted border border-border/40 overflow-hidden">
                      {imgUrl ? (
                        <Image
                          src={imgUrl}
                          alt={selectedProduct.name}
                          fill
                          className="object-cover"
                          sizes="280px"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground/40">
                          <Package className="w-10 h-10" />
                          <span className="text-[10px] font-medium">
                            No image
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-1 gap-3 bg-muted/40 p-3.5 border border-border/40 rounded-xl">
                <div className="flex space-y-0.5 items-center justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">
                    Price
                  </span>
                  <span className="font-medium text-foreground text-sm">
                    UGX {selectedProduct.basePrice.toLocaleString()}
                  </span>
                </div>
                <div className="flex space-y-0.5 items-center justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">
                    Stock
                  </span>
                  <span className="font-medium text-foreground text-sm">
                    {selectedProduct.inventoryCount ?? 0} units
                  </span>
                </div>
                <div className="flex space-y-0.5 items-center justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">
                    Status
                  </span>
                  <span className="font-medium text-foreground text-sm">
                    {selectedProduct.status || "Unknown"}
                  </span>
                </div>
                <div className="flex space-y-0.5 items-center justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">
                    Brand
                  </span>
                  <span className="font-medium text-foreground text-sm">
                    {selectedProduct.brand || "—"}
                  </span>
                </div>
              </div>

              {selectedProduct.description && (
                <div className="space-y-1">
                  <h4 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Description
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {selectedProduct.description}
                  </p>
                </div>
              )}

              <div className="space-y-2 border-t border-border/40 pt-3">
                <div className="flex justify-between items-center py-0.5 text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5" />
                    Store
                  </span>
                  <span className="font-medium text-foreground">
                    {selectedProduct.vendor?.storeName || "Unknown"}
                  </span>
                </div>
                {selectedProduct.category && (
                  <div className="flex justify-between items-center py-0.5 text-xs">
                    <span className="text-muted-foreground">Category</span>
                    <span className="font-medium text-foreground">
                      {selectedProduct.category.name}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center py-0.5 text-xs">
                  <span className="text-muted-foreground">SKU</span>
                  <span className="font-medium text-foreground font-mono">
                    {selectedProduct.sku || "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-border/40 pt-4 mt-6">
              <button
                onClick={() => setSelectedProduct(null)}
                className="w-full h-10 rounded-xl text-xs font-medium border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer">
                Close
              </button>
            </div>
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}
