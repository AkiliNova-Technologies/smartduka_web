"use client";

import * as React from "react";
import {
  Tag,
  Store,
  Search,
  Star,
  Boxes,
  ShieldAlert,
  EyeOff,
  Ban,
  RefreshCw,
  Eye,
  MoreVertical,
} from "lucide-react";
import Image from "next/image";
import { type ColumnDef } from "@tanstack/react-table";
import { mockDatabase } from "@/data/mockDatabase";
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
import { Product } from "@/types/marketplace";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SupervisedProduct extends Product {
  moderationStatus: "active" | "suspended" | "banned";
  description?: string; // Appending description field for deep inspection view
}

export default function AdminProductsPage() {
  // Initialize state directly with computed data instead of using useEffect
  const [products, setProducts] = React.useState<SupervisedProduct[]>(() =>
    mockDatabase.products.map((p, idx) => ({
      ...p,
      moderationStatus:
        idx === 2 ? "suspended" : idx === 4 ? "banned" : "active",
      description: `Premium high-performance equipment curated for local town routines. Built with standard marketplace fabrics, ensuring breathability across sports and lifestyle setups.`,
    })),
  );

  const [searchQuery, setSearchQuery] = React.useState("");

  const [selectedProduct, setSelectedProduct] =
    React.useState<SupervisedProduct | null>(null);

  const fallbackProductImage =
    "https://images.unsplash.com/photo-1542291026-7eec26427ff?auto=format&fit=crop&w=600&q=80";

  const handleToggleSuspension = React.useCallback((id: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const nextStatus: "active" | "suspended" | "banned" =
          p.moderationStatus === "suspended" ? "active" : "suspended";
        const updatedProduct: SupervisedProduct = {
          ...p,
          moderationStatus: nextStatus,
        };
        setSelectedProduct((current) =>
          current?.id === id ? updatedProduct : current,
        );
        return updatedProduct;
      }),
    );
  }, []);

  const handleToggleBan = React.useCallback((id: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const nextStatus: "active" | "suspended" | "banned" =
          p.moderationStatus === "banned" ? "active" : "banned";
        const updatedProduct: SupervisedProduct = {
          ...p,
          moderationStatus: nextStatus,
        };
        setSelectedProduct((current) =>
          current?.id === id ? updatedProduct : current,
        );
        return updatedProduct;
      }),
    );
  }, []);

  const filteredProducts = React.useMemo(() => {
    return products.filter(
      (product) =>
        (product.name ?? "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (product.brand ?? "").toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [products, searchQuery]);

  const totalMonitored = products.length;
  const totalSuspended = products.filter(
    (p) => p.moderationStatus === "suspended",
  ).length;
  const totalBanned = products.filter(
    (p) => p.moderationStatus === "banned",
  ).length;

  const columns = React.useMemo<ColumnDef<SupervisedProduct, unknown>[]>(
    () => [
      {
        accessorKey: "image",
        header: "Media",
        cell: ({ row }) => (
          <div className="relative size-10 rounded-full bg-muted border border-border/40 overflow-hidden shrink-0 select-none">
            <Image
              src={row.original.image || fallbackProductImage}
              alt={row.original.name}
              fill
              sizes="40px"
              className={cn(
                "object-cover transition-opacity",
                row.original.moderationStatus !== "active" &&
                  "opacity-40 grayscale",
              )}
            />
          </div>
        ),
      },
      {
        accessorKey: "name",
        header: "Product Specification",
        cell: ({ row }) => (
          <div className="space-y-0.5 max-w-[220px]">
            <button
              onClick={() => setSelectedProduct(row.original)}
              className={cn(
                "font-medium text-foreground block tracking-tight text-left truncate hover:text-primary transition-colors cursor-pointer outline-none",
                row.original.moderationStatus === "banned" &&
                  "text-muted-foreground line-through",
              )}>
              {row.original.name}
            </button>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-semibold">
              <span className="uppercase tracking-wider text-primary">
                {row.original.brand ?? "Unbranded"}
              </span>
              <span>•</span>
              <span className="font-mono text-muted-foreground/70">
                SKU: {row.original.id}
              </span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "vendorId",
        header: "Source Merchant Duka",
        cell: ({ row }) => {
          // The store ID in mockDatabase.stores is the vendorId
          const matchingStore = mockDatabase.stores.find(
            (s) => s.id === row.original.vendorId,
          );
          return (
            <span className="font-semibold text-foreground tracking-tight flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-muted-foreground" />
              {matchingStore ? matchingStore.name : "Local Merchant"}
            </span>
          );
        },
      },
      {
        accessorKey: "basePrice",
        header: "Market Pricing",
        cell: ({ row }) => (
          <span className="text-xs font-medium text-foreground tracking-tight">
            UGX {row.original.basePrice.toLocaleString()}
          </span>
        ),
      },
      {
        id: "moderationStatus",
        header: "Compliance State",
        cell: ({ row }) => {
          const status = row.original.moderationStatus;
          return (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-medium px-2.5 py-0.5 rounded-full border select-none",
                status === "active" &&
                  "text-emerald-600 bg-emerald-500/5 border-emerald-500/10",
                status === "suspended" &&
                  "text-amber-600 bg-amber-500/5 border-amber-500/10",
                status === "banned" &&
                  "text-rose-600 bg-rose-500/5 border-rose-500/10",
              )}>
              <span className="capitalize">{status}</span>
            </span>
          );
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">Oversight</div>,
        cell: ({ row }) => {
          const isSuspended = row.original.moderationStatus === "suspended";
          const isBanned = row.original.moderationStatus === "banned";

          return (
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedProduct(row.original)}
                className="p-1.5 rounded-md border border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted bg-card transition-colors cursor-pointer"
                name="Inspect Layout details">
                <Eye className="w-3.5 h-3.5" />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 rounded-md border border-border/40 hover:bg-muted text-muted-foreground cursor-pointer outline-none">
                    <MoreVertical className="size-3.5" />
                    <span className="sr-only">
                      Open governance context panel
                    </span>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-44 rounded-lg border border-border/60 p-1 text-xs font-medium bg-card text-card-foreground shadow-md animate-in fade-in-50 duration-150">
                  <DropdownMenuItem
                    disabled={isBanned}
                    onClick={() => handleToggleSuspension(row.original.id)}
                    className={cn(
                      "rounded-lg py-2 px-2.5 text-xs flex items-center gap-2 cursor-pointer transition-colors outline-none",
                      isSuspended
                        ? "text-amber-600 focus:text-amber-600 focus:bg-amber-500/5 dark:focus:bg-amber-500/10"
                        : "text-foreground focus:bg-zinc-800",
                    )}>
                    {isSuspended ? (
                      <RefreshCw className="size-3.5" />
                    ) : (
                      <EyeOff className="size-3.5" />
                    )}
                    <span>
                      {isSuspended ? "Reinstate Listing" : "Hide From Feed"}
                    </span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-border/40 my-1" />

                  <DropdownMenuItem
                    onClick={() => handleToggleBan(row.original.id)}
                    className={cn(
                      "rounded-lg py-2 px-2.5 text-xs flex items-center gap-2 cursor-pointer transition-colors outline-none",
                      isBanned
                        ? "text-emerald-600 focus:text-emerald-600 focus:bg-emerald-500/5 dark:focus:bg-emerald-500/10"
                        : "text-rose-600 focus:text-rose-600 focus:bg-rose-500/5 dark:focus:bg-rose-500/10",
                    )}>
                    <Ban className="size-3.5" />
                    <span>{isBanned ? "Pardon Product" : "Ban From Feed"}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [handleToggleSuspension, handleToggleBan],
  );

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      <div className="space-y-1 select-none">
        <h2 className="text-xl font-medium tracking-tight text-foreground">
          Catalog Moderation Hub
        </h2>
        <p className="text-xs font-semibold text-muted-foreground">
          Ecosystem compliance directory monitoring multi-vendor listings.
          Suspend or ban items violating quality policies or trading
          regulations.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 select-none">
        {[
          {
            label: "Monitored Platform Items",
            value: totalMonitored,
            icon: Boxes,
            style: "bg-card border-border/60",
          },
          {
            label: "Hidden / Suspended Listings",
            value: totalSuspended,
            icon: EyeOff,
            style:
              "bg-card border-border/60 text-amber-600 dark:text-amber-400",
          },
          {
            label: "Banned Marketplace SKUs",
            value: totalBanned,
            icon: ShieldAlert,
            style: "bg-card border-border/60 text-rose-600 dark:text-rose-400",
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
              <h3 className="text-xl sm:text-2xl font-medium text-foreground tracking-tight">
                {kpi.value}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-muted/60 border border-border/40 text-muted-foreground">
              <kpi.icon className="w-4 h-4" />
            </div>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filteredProducts}
        getRowId={(row) => row.id}
        renderTabs={
          <div className="flex items-center gap-3 w-full max-w-xs relative group">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              placeholder="Search platform items by name or brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 border-border/60 rounded-xl bg-muted/20 text-xs focus-visible:ring-primary/20 focus-visible:border-primary"
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
            className="w-full sm:max-w-md bg-card border-l border-border/60 p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              <SheetHeader className="text-left select-none px-0">
                <SheetTitle className="text-base font-medium text-foreground leading-tight">
                  {selectedProduct.name}
                </SheetTitle>
                <SheetDescription className="text-xs font-medium text-muted-foreground font-mono">
                  Ecosystem Asset Ref: {selectedProduct.id}
                </SheetDescription>
              </SheetHeader>

              <div className="relative w-full h-48 rounded-2xl bg-muted border border-border/40 overflow-hidden shadow-2xs select-none">
                <Image
                  src={selectedProduct.image || fallbackProductImage}
                  alt={selectedProduct.name}
                  fill
                  className={cn(
                    "object-cover transition-transform duration-500",
                    selectedProduct.moderationStatus !== "active" &&
                      "opacity-40 grayscale",
                  )}
                />
                <div className="absolute top-3 right-3">
                  <span
                    className={cn(
                      "text-[10px] font-medium px-2.5 py-0.5 rounded-full border shadow-sm backdrop-blur-md uppercase tracking-wider",
                      selectedProduct.moderationStatus === "active" &&
                        "bg-emerald-500 border-emerald-500/20 text-white",
                      selectedProduct.moderationStatus === "suspended" &&
                        "bg-amber-500 border-amber-500/20 text-white",
                      selectedProduct.moderationStatus === "banned" &&
                        "bg-rose-500 border-rose-500/20 text-white",
                    )}>
                    {selectedProduct.moderationStatus}
                  </span>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 bg-muted/40 p-3.5 border border-border/40 rounded-xl">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider block">
                      Price Value
                    </span>
                    <span className="font-medium text-foreground text-sm">
                      UGX {selectedProduct.basePrice.toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider block">
                      Stock Level
                    </span>
                    <span className="font-medium text-foreground text-sm">
                      {selectedProduct.inventoryCount || 12} items
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Product Content Description
                  </h4>
                  <p className="text-foreground leading-relaxed text-muted-foreground/90 font-medium">
                    {selectedProduct.description}
                  </p>
                </div>

                <div className="space-y-2 border-t border-border/40 pt-3">
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5" /> Vendor Duka:
                    </span>
                    <span className="font-medium text-foreground">
                      {mockDatabase.stores.find(
                        (s) => s.id === selectedProduct.vendorId,
                      )?.name || "Local Shop"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" /> Taxonomy Node:
                    </span>
                    <span className="font-medium text-foreground">
                      {mockDatabase.categories.find(
                        (c) => c.id === selectedProduct.categoryId,
                      )?.name || "General"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />{" "}
                      Platform Rating:
                    </span>
                    <span className="font-medium text-foreground">
                      {selectedProduct.rating} / 5.0 ({selectedProduct.reviews}{" "}
                      orders)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-border/40 pt-4 mt-6">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={selectedProduct.moderationStatus === "banned"}
                  onClick={() => handleToggleSuspension(selectedProduct.id)}
                  className="flex-1 h-10 rounded-xl text-xs font-medium gap-1.5 cursor-pointer border-border/70 text-foreground">
                  {selectedProduct.moderationStatus === "suspended" ? (
                    <RefreshCw className="w-3.5 h-3.5" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {selectedProduct.moderationStatus === "suspended"
                      ? "Reinstate Listing"
                      : "Hide From Feed"}
                  </span>
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => handleToggleBan(selectedProduct.id)}
                  className={cn(
                    "flex-1 h-10 rounded-xl text-xs font-medium gap-1.5 cursor-pointer",
                    selectedProduct.moderationStatus === "banned"
                      ? "bg-emerald-500/10! hover:bg-emerald-500/20 text-white border border-emerald-500/20"
                      : "bg-rose-500 hover:bg-rose-600 text-white",
                  )}>
                  <Ban className="w-3.5 h-3.5" />
                  <span>
                    {selectedProduct.moderationStatus === "banned"
                      ? "Pardon Item"
                      : "Ban Product"}
                  </span>
                </Button>
              </div>

              <Button
                variant="secondary"
                onClick={() => setSelectedProduct(null)}
                className="w-full h-10 rounded-xl text-xs font-medium tracking-tight border border-border/40 text-muted-foreground hover:text-foreground cursor-pointer">
                Close Inspector
              </Button>
            </div>
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}
