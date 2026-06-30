"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, Edit2, Box, Eye } from "lucide-react";
import { mockDatabase } from "@/data/mockDatabase";
import { DataTable } from "@/components/data-table";
import { cn } from "@/lib/utils";

// Make sure your type declarations reflect the data architecture schema perfectly
interface MerchantProduct {
  id: string;
  title: string;
  brand: string;
  price: number;
  originalPrice?: number;
  inventoryCount?: number;
  image: string;
}

export default function VendorProductsPage() {
  // Sourcing relational data structures corresponding directly to our profile target
  const [productsList, setProductsList] = React.useState<MerchantProduct[]>(
    () => mockDatabase.products.filter((p) => p.storeId === "st-nike-ug-001"),
  );

  // Define table structures with strict typings
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
                alt=""
                fill
                sizes="40px"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
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
              <span className="font-medium text-sm truncate text-foreground group-hover:text-primary transition-colors">
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
              {product.originalPrice && (
                <span className="text-[10px] text-muted-foreground line-through font-semibold">
                  UGX {product.originalPrice.toLocaleString()}
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
      {/* HEADER SECTION INTERFACE */}
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

        <Link
          href="/vendor/products/new"
          className="inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-primary text-primary-foreground text-xs font-semibold rounded-full hover:bg-emerald-600 active:scale-95 transition-all shrink-0">
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add New Listing</span>
        </Link>
      </div>

      {/* REUSABLE PREMIUM DATATABLE COMPONENT FRAMEWORK */}
      <DataTable
        columns={columns}
        data={productsList}
        getRowId={(product) => product.id}
        onReorder={(rearrangedData) => setProductsList(rearrangedData)}
        renderTabs={
          <div className="flex items-center select-none">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
              Active Catalog Stack ({productsList.length})
            </span>
          </div>
        }
      />
    </div>
  );
}
