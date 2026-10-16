"use client";

import { useCallback, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangle,
  Boxes,
  ChevronDown,
  ChevronRight,
  CircleOff,
  Package,
  PencilLine,
  Plus,
} from "lucide-react";
import { DashboardMetricCard } from "@/components/dashboard-metric-card";
import { DataTable } from "@/components/data-table";
import { DataTableRowActions } from "@/components/data-table-row-actions";
import { DataTableStatusFilter } from "@/components/data-table-status-filter";
import { InventoryUpdateDialog } from "@/components/vendor/inventory-update-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBranchInventory } from "@/hooks/use-branch-inventory";
import type { BranchInventoryData } from "@/lib/branch-inventory-client";
import { cn } from "@/lib/utils";

type Product = BranchInventoryData["products"][number];
type Variant = Product["variants"][number];
type StockItem = {
  productId: string;
  variantId: string | null;
  name: string;
  variant: string | null;
  stock: number;
};
type StockStatus = "ALL" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
type VariantFilter = "ALL" | "WITH_VARIANTS" | "WITHOUT_VARIANTS";
const LOW_STOCK_LIMIT = 5;

export function getInventoryProductQuantity(product: Product) {
  return product.variants.length
    ? product.variants.reduce(
        (total, variant) => total + variant.inventoryCount,
        0,
      )
    : product.inventoryCount;
}

function getStockStatus(quantity: number): Exclude<StockStatus, "ALL"> {
  if (quantity === 0) return "OUT_OF_STOCK";
  return quantity <= LOW_STOCK_LIMIT ? "LOW_STOCK" : "IN_STOCK";
}

export function InventoryClient() {
  const { data, loading, error, mutate, adjustStandard, refresh } = useBranchInventory();
  const [open, setOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [statusFilter, setStatusFilter] = useState<StockStatus>("ALL");
  const [variantFilter, setVariantFilter] = useState<VariantFilter>("ALL");
  const [locationFilter, setLocationFilter] = useState("ALL");

  const products = useMemo(() => data?.products ?? [], [data?.products]);
  const managed = data?.mode === "LOCATION_MANAGED";
  const stockItems = useMemo(
    () =>
      products.flatMap<StockItem>((product) =>
        product.variants.length
          ? product.variants.map((variant) => ({
              productId: product.id,
              variantId: variant.id,
              name: product.name,
              variant: variant.name,
              stock: variant.inventoryCount,
            }))
          : [
              {
                productId: product.id,
                variantId: null,
                name: product.name,
                variant: null,
                stock: product.inventoryCount,
              },
            ],
      ),
    [products],
  );
  const visibleProducts = useMemo(
    () =>
      products.filter((product) => {
        const statusMatches =
          statusFilter === "ALL" ||
          getStockStatus(getInventoryProductQuantity(product)) === statusFilter;
        const variantsMatch =
          variantFilter === "ALL" ||
          (variantFilter === "WITH_VARIANTS"
            ? product.variants.length > 0
            : product.variants.length === 0);
        return statusMatches && variantsMatch;
      }),
    [products, statusFilter, variantFilter],
  );
  const metrics = useMemo(
    () => ({
      products: products.length,
      units: stockItems.reduce((sum, item) => sum + item.stock, 0),
      low: stockItems.filter(
        (item) => item.stock > 0 && item.stock <= LOW_STOCK_LIMIT,
      ).length,
      out: stockItems.filter((item) => item.stock === 0).length,
    }),
    [products.length, stockItems],
  );

  const allocated = useCallback(
    (productId: string, variantId: string | null) => (data?.inventories ?? [])
      .filter(
        (row) =>
          row.productId === productId &&
          row.variantId === variantId &&
          (locationFilter === "ALL" || row.branchId === locationFilter),
      )
      .reduce((sum, row) => sum + row.onHandQuantity, 0),
    [data?.inventories, locationFilter],
  );

  function beginUpdate(productId?: string, variantId?: string | null) {
    setSelectedProductId(productId ?? "");
    setSelectedVariantId(variantId ?? null);
    setOpen(true);
  }

  const columns = useMemo<ColumnDef<Product, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Product",
        cell: ({ row }) => (
          <div className="flex min-w-44 items-center gap-2">
            {row.original.variants.length ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 rounded-full"
                aria-label={`${expanded.has(row.original.id) ? "Collapse" : "Expand"} ${row.original.name} variants`}
                aria-expanded={expanded.has(row.original.id)}
                onClick={() =>
                  setExpanded((current) => {
                    const next = new Set(current);
                    if (next.has(row.original.id)) next.delete(row.original.id);
                    else next.add(row.original.id);
                    return next;
                  })
                }>
                {expanded.has(row.original.id) ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </Button>
            ) : (
              <span className="size-7" />
            )}
            <span className="max-w-52 truncate font-semibold">
              {row.original.name}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "sku",
        header: "SKU",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.sku ??
              (row.original.variants.length ? "Multiple" : "—")}
          </span>
        ),
      },
      {
        id: "variants",
        header: "Variants",
        accessorFn: (product) => product.variants.length,
        cell: ({ row }) =>
          row.original.variants.length
            ? `${row.original.variants.length} variant${row.original.variants.length === 1 ? "" : "s"}`
            : "Simple",
      },
      {
        id: "available",
        header: "Available stock",
        accessorFn: getInventoryProductQuantity,
        cell: ({ row }) => (
          <span className="font-semibold">
            {getInventoryProductQuantity(row.original)}
          </span>
        ),
      },
      ...(managed
        ? [
            {
              id: "allocated",
              header: locationFilter === "ALL" ? "Allocated" : "At location",
              accessorFn: (product: Product) =>
                product.variants.length
                  ? product.variants.reduce(
                      (sum, variant) => sum + allocated(product.id, variant.id),
                      0,
                    )
                  : allocated(product.id, null),
              cell: ({ row }: { row: { original: Product } }) => (
                <span>
                  {row.original.variants.length
                    ? row.original.variants.reduce(
                        (sum, variant) =>
                          sum + allocated(row.original.id, variant.id),
                        0,
                      )
                    : allocated(row.original.id, null)}
                </span>
              ),
            } as ColumnDef<Product, unknown>,
          ]
        : []),
      {
        id: "status",
        header: "Stock status",
        accessorFn: (product) =>
          getStockStatus(getInventoryProductQuantity(product)),
        cell: ({ row }) => (
          <StockBadge quantity={getInventoryProductQuantity(row.original)} />
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <DataTableRowActions
            actions={[
              {
                id: "update",
                label: row.original.variants.length
                  ? "Expand variants to update stock"
                  : "Update stock",
                icon: PencilLine,
                onSelect: () =>
                  row.original.variants.length
                    ? setExpanded((current) =>
                        new Set(current).add(row.original.id),
                      )
                    : beginUpdate(row.original.id, null),
              },
            ]}
          />
        ),
      },
    ],
    [allocated, expanded, locationFilter, managed],
  );

  if (loading && !data)
    return (
      <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
        Loading inventory…
      </div>
    );
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">
            {managed ? "Location-managed inventory" : "Standard inventory"}
          </p>
          <h1 className="text-2xl font-semibold">Inventory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {managed
              ? "Distribute stock across fulfilment locations."
              : "Manage the stock available from your shop."}
          </p>
        </div>
        <Button onClick={() => beginUpdate()}>
          <Plus className="mr-2 size-4" />
          {managed ? "Manage location stock" : "Update stock"}
        </Button>
      </header>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard
          label="Total products"
          value={metrics.products}
          icon={Package}
          description="Primary catalogue products"
        />
        <DashboardMetricCard
          label="Available units"
          value={metrics.units}
          icon={Boxes}
          description="Across simple items and variants"
          tone="info"
        />
        <DashboardMetricCard
          label="Low-stock items"
          value={metrics.low}
          icon={AlertTriangle}
          description="1–5 units remaining"
          tone="warning"
        />
        <DashboardMetricCard
          label="Out-of-stock items"
          value={metrics.out}
          icon={CircleOff}
          description="Simple items and variants at zero"
          tone="danger"
        />
      </div>
      {open && (
        <InventoryUpdateDialog
          open
          onOpenChange={setOpen}
          data={data}
          initialProductId={selectedProductId || undefined}
          initialVariantId={selectedVariantId}
          adjustStandard={adjustStandard}
          mutateLocation={mutate}
          refresh={refresh}
        />
      )}
      <DataTable
        columns={columns}
        data={visibleProducts}
        getRowId={(product) => product.id}
        isLoading={loading}
        defaultPageSize={10}
        features={{ search: true, rowSelection: false }}
        searchPlaceholder="Search product or SKU..."
        getSearchText={(product) =>
          [
            product.name,
            product.sku,
            ...product.variants.flatMap((variant) => [
              variant.name,
              variant.sku,
            ]),
          ]
            .filter(Boolean)
            .join(" ")
        }
        toolbarContent={
          <InventoryFilters
            managed={managed}
            data={data}
            status={statusFilter}
            onStatusChange={setStatusFilter}
            variants={variantFilter}
            onVariantsChange={setVariantFilter}
            location={locationFilter}
            onLocationChange={setLocationFilter}
          />
        }
        emptyStateContent="No inventory matches the current search and filters."
        renderSubRow={(product) =>
          expanded.has(product.id) ? (
            <VariantRows
              product={product}
              managed={managed}
              allocated={allocated}
              onUpdate={(variant) => beginUpdate(product.id, variant.id)}
            />
          ) : null
        }
      />
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="font-medium">Inventory history</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {managed
            ? "Location movements appear here when stock is allocated, sold, restored, or corrected."
            : "Stock changes remain available in your shop audit history."}
        </p>
      </section>
    </div>
  );
}

function InventoryFilters({
  managed,
  data,
  status,
  onStatusChange,
  variants,
  onVariantsChange,
  location,
  onLocationChange,
}: {
  managed: boolean;
  data: BranchInventoryData | null;
  status: StockStatus;
  onStatusChange: (value: StockStatus) => void;
  variants: VariantFilter;
  onVariantsChange: (value: VariantFilter) => void;
  location: string;
  onLocationChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <DataTableStatusFilter
        value={status}
        onValueChange={onStatusChange}
        options={[
          { value: "ALL", label: "All stock" },
          { value: "IN_STOCK", label: "In stock" },
          { value: "LOW_STOCK", label: "Low stock" },
          { value: "OUT_OF_STOCK", label: "Out of stock" },
        ]}
      />
      <Select
        value={variants}
        onValueChange={(value) => onVariantsChange(value as VariantFilter)}>
        <SelectTrigger
          aria-label="Variant filter"
          size="sm"
          className="min-w-40 rounded-lg text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          <SelectItem value="ALL">All product types</SelectItem>
          <SelectItem value="WITH_VARIANTS">With variants</SelectItem>
          <SelectItem value="WITHOUT_VARIANTS">Without variants</SelectItem>
        </SelectContent>
      </Select>
      {managed && (
        <Select value={location} onValueChange={onLocationChange}>
          <SelectTrigger
            aria-label="Location filter"
            size="sm"
            className="min-w-40 rounded-lg text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value="ALL">All locations</SelectItem>
            {data?.branches.map((branch) => (
              <SelectItem
                key={branch.id}
                value={branch.id}
                disabled={!branch.isActive}>
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

function VariantRows({
  product,
  managed,
  allocated,
  onUpdate,
}: {
  product: Product;
  managed: boolean;
  allocated: (productId: string, variantId: string | null) => number;
  onUpdate: (variant: Variant) => void;
}) {
  if (!product.variants.length) return null;
  return (
    <div
      className="divide-y divide-border/40 px-3 py-1 sm:px-8"
      aria-label={`${product.name} variants`}>
      {product.variants.map((variant) => {
        const assigned = allocated(product.id, variant.id);
        return (
          <div
            key={variant.id}
            className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2 sm:grid-cols-[minmax(0,2fr)_minmax(7rem,1fr)_6rem_8rem_auto]">
            <div className="min-w-0 pl-7 sm:pl-0">
              <p className="truncate text-xs font-semibold">{variant.name}</p>
              <p className="truncate font-mono text-[11px] text-muted-foreground sm:hidden">
                {variant.sku ?? "No SKU"}
              </p>
            </div>
            <span className="hidden font-mono text-[11px] text-muted-foreground sm:block">
              {variant.sku ?? "—"}
            </span>
            <span className="hidden text-xs font-semibold sm:block">
              {variant.inventoryCount}
            </span>
            <div className="hidden sm:block">
              <StockBadge quantity={variant.inventoryCount} />
              {managed && (
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {assigned} allocated ·{" "}
                  {Math.max(0, variant.inventoryCount - assigned)} unallocated
                </p>
              )}
            </div>
            <DataTableRowActions
              actions={[
                {
                  id: "update",
                  label: `Update ${variant.name} stock`,
                  icon: PencilLine,
                  onSelect: () => onUpdate(variant),
                },
              ]}
            />
          </div>
        );
      })}
    </div>
  );
}

function StockBadge({ quantity }: { quantity: number }) {
  const status = getStockStatus(quantity);
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-1 text-[10px] font-semibold",
        status === "OUT_OF_STOCK" && "bg-destructive/10 text-destructive",
        status === "LOW_STOCK" &&
          "bg-amber-500/10 text-amber-700 dark:text-amber-300",
        status === "IN_STOCK" &&
          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      )}>
      {status === "OUT_OF_STOCK"
        ? "Out of stock"
        : status === "LOW_STOCK"
          ? "Low stock"
          : "In stock"}
    </span>
  );
}
