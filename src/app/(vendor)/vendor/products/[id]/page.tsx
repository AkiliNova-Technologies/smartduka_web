"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Edit2,
  Box,
  AlertTriangle,
  TrendingDown,
  Star,
  Package,
  Tag,
  Ruler,
  FileText,
  ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProducts } from "@/hooks/use-products";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product } from "@/types/marketplace";
import Image from "next/image";

function ProductDetailSkeleton() {
  return (
    <div className="space-y-6 w-full max-w-8xl mx-auto">
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-48 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3 w-64 rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-card border border-border/60 rounded-2xl p-4">
            <Skeleton className="aspect-square w-full rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        </div>
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4">
            <Skeleton className="h-5 w-20 rounded-md" />
            <Skeleton className="h-6 w-64 rounded-md" />
            <Skeleton className="h-8 w-40 rounded-md" />
            <div className="grid grid-cols-4 gap-3 pt-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

function ErrorState({ error }: { error: string }) {
  return (
    <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-amber-500" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-foreground">Error Loading Product</h3>
        <p className="text-xs text-muted-foreground max-w-sm">{error}</p>
      </div>
      <Link
        href="/vendor/products"
        className="inline-flex items-center gap-1.5 px-4 h-9 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-full text-xs font-bold hover:bg-primary dark:hover:bg-primary dark:hover:text-white transition-all">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Products
      </Link>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
        <Package className="w-8 h-8 text-muted-foreground/40" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-foreground">Product Not Found</h3>
        <p className="text-xs text-muted-foreground">
          This product may have been removed or the link is incorrect.
        </p>
      </div>
      <Link
        href="/vendor/products"
        className="inline-flex items-center gap-1.5 px-4 h-9 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-full text-xs font-bold hover:bg-primary dark:hover:bg-primary dark:hover:text-white transition-all">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Products
      </Link>
    </div>
  );
}

export default function VendorProductPreviewPage() {
  const params = useParams();
  const productId = typeof params.id === "string" ? params.id : null;

  const { fetchProductById } = useProducts();

  const [product, setProduct] = React.useState<Product | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const fetchedRef = React.useRef(false);

  React.useEffect(() => {
    if (!productId || fetchedRef.current || !fetchProductById) return;
    fetchedRef.current = true;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchProductById(productId);
        setProduct(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load product.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [productId, fetchProductById]);

  if (!fetchProductById) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-muted-foreground">
          Product management requires VendorCatalogProvider.
        </p>
      </div>
    );
  }

  if (!productId) {
    return <NotFoundState />;
  }

  if (loading) {
    return <ProductDetailSkeleton />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  if (!product) {
    return <NotFoundState />;
  }

  const basePrice = Number(product.basePrice) ?? 0;
  const compareAtPrice = product.compareAtPrice ? Number(product.compareAtPrice) : undefined;
  const productName = product.name ?? "";
  const inventoryCount = product.inventoryCount ?? 0;
  const rating = product.rating ?? 0;
  const reviews = product.reviews ?? 0;
  const brand = product.brand ?? "Independent Manufacturer";
  const sku = product.sku ?? product.id?.slice(0, 8) ?? "N/A";
  const productDescription = product.description || "No description provided.";
  const productSizes = product.sizes || [];
  const productColors = product.colors || [];
  const productTags = product.tags || [];
  const productSpecs = (product.specs || []) as { name: string; value: string }[];
  const categoryName = product.category?.name || "Uncategorized";
  const subCategoryName = product.subCategory?.name || null;
  const storeName = product.vendor?.storeName || "Main Store";

  const markdownPercentage = compareAtPrice
    ? Math.round(((compareAtPrice - basePrice) / compareAtPrice) * 100)
    : 0;

  const isLowStock = inventoryCount <= 5 && inventoryCount > 0;
  const isOutOfStock = inventoryCount === 0;

  return (
    <div className="space-y-6 max-w-8xl mx-auto animate-in fade-in duration-300">
      <div className="flex items-center justify-between border-b border-border/40 pb-4 select-none">
        <div className="flex items-center gap-3">
          <Link
            href="/vendor/products"
            className="p-2 border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-all">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-medium tracking-tight text-foreground">{productName}</h1>
              <span
                className={cn(
                  "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                  isOutOfStock
                    ? "bg-rose-500/5 border-rose-500/10 text-rose-600"
                    : isLowStock
                      ? "bg-amber-500/5 border-amber-500/10 text-amber-600"
                      : "bg-emerald-500/5 border-emerald-500/10 text-emerald-600",
                )}>
                {isOutOfStock ? "Out of Stock" : isLowStock ? "Low Stock" : "In Stock"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Product ID: <code className="font-mono text-[11px]">{product.id}</code>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/products/${product.id}`}
            className="h-9 px-4 border border-border/60 hover:bg-muted text-xs font-medium rounded-full transition-all flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>View Storefront</span>
          </Link>
          <Link
            href={`/vendor/products/${product.id}/edit`}
            className="h-9 px-4 bg-primary text-primary-foreground text-xs font-medium rounded-full hover:bg-emerald-600 active:scale-95 transition-all flex items-center gap-1.5">
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Product</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)]">
            <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-muted border border-border/40">
              <Image src={product.image} alt={productName} fill className="w-full h-full object-cover" />
              {markdownPercentage > 0 && (
                <span className="absolute top-3 left-3 bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                  -{markdownPercentage}% OFF
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-[10px] font-medium uppercase tracking-wider">Rating</span>
              </div>
              <p className="text-lg font-medium text-foreground">
                {rating} <span className="text-xs text-muted-foreground">/ 5.0</span>
              </p>
              <p className="text-[10px] text-muted-foreground">{reviews} reviews</p>
            </div>
            <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Box className="w-3.5 h-3.5" />
                <span className="text-[10px] font-medium uppercase tracking-wider">Stock</span>
              </div>
              <p className={cn("text-lg font-medium", isOutOfStock ? "text-rose-500" : isLowStock ? "text-amber-500" : "text-foreground")}>
                {inventoryCount}
              </p>
              <p className="text-[10px] text-muted-foreground">units available</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-4">
          <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)]">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-md uppercase tracking-wider inline-block">{brand}</span>
              <h2 className="text-lg font-medium text-foreground tracking-tight pt-1">{productName}</h2>
            </div>
            <div className="border-t border-border/40 pt-3 flex items-baseline gap-3 flex-wrap">
              <span className="text-2xl font-extrabold text-foreground tracking-tight">UGX {basePrice.toLocaleString()}</span>
              {compareAtPrice && (
                <>
                  <span className="text-sm text-muted-foreground font-medium line-through">UGX {compareAtPrice.toLocaleString()}</span>
                  <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/5 text-emerald-600 font-extrabold border border-emerald-500/10 px-2 py-0.5 rounded-full">
                    <TrendingDown className="w-2.5 h-2.5" /> Save {markdownPercentage}%
                  </span>
                </>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border/40">
              <div className="space-y-0.5">
                <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">SKU</span>
                <p className="text-xs font-mono font-medium text-foreground">{sku}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Category</span>
                <p className="text-xs font-medium text-foreground truncate" title={subCategoryName ? `${categoryName} › ${subCategoryName}` : categoryName}>
                  {subCategoryName || categoryName}
                </p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Store</span>
                <p className="text-xs font-medium text-foreground truncate">{storeName}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Status</span>
                <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", isOutOfStock ? "bg-rose-500/5 border-rose-500/10 text-rose-600" : isLowStock ? "bg-amber-500/5 border-amber-500/10 text-amber-600" : "bg-emerald-500/5 border-emerald-500/10 text-emerald-600")}>
                  {isOutOfStock ? "Out of Stock" : isLowStock ? "Low Stock" : "Active"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Variants</h3>
              </div>
              {productSizes.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-medium text-muted-foreground">Available Sizes</span>
                  <div className="flex flex-wrap gap-1.5">
                    {productSizes.map((size) => (
                      <span key={size} className="px-2.5 py-1 bg-muted/50 border border-border/40 rounded-md text-[11px] font-medium text-foreground">{size}</span>
                    ))}
                  </div>
                </div>
              )}
              {productColors.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-medium text-muted-foreground">Available Colors</span>
                  <div className="flex flex-wrap gap-1.5">
                    {productColors.map((color) => (
                      <span key={color} className="px-2.5 py-1 bg-muted/50 border border-border/40 rounded-md text-[11px] font-medium text-foreground">{color}</span>
                    ))}
                  </div>
                </div>
              )}
              {productSizes.length === 0 && productColors.length === 0 && (
                <p className="text-[11px] text-muted-foreground italic">No variants configured</p>
              )}
            </div>

            <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Specifications</h3>
              </div>
              {productSpecs.length > 0 ? (
                <div className="space-y-2">
                  {productSpecs.map((spec, index) => (
                    <div key={index} className={cn("flex justify-between items-center py-1.5 px-2 rounded-lg text-xs", index % 2 === 0 ? "bg-muted/20" : "")}>
                      <span className="text-muted-foreground font-medium">{spec.name}</span>
                      <span className="font-medium text-foreground text-right max-w-[140px] truncate">{spec.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground italic">No specifications provided</p>
              )}
            </div>
          </div>

          <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)]">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Description</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{productDescription}</p>
            </div>
            {productTags.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tags</h3>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {productTags.map((tag) => (
                    <span key={tag} className="px-2.5 py-1 bg-primary/5 border border-primary/10 rounded-full text-[10px] font-medium text-primary">#{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {isLowStock && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-amber-600">Low Stock Warning</p>
                <p className="text-[11px] text-amber-500/80">Only {inventoryCount} units remaining. Consider restocking soon.</p>
              </div>
            </div>
          )}

          {isOutOfStock && (
            <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-rose-600">Out of Stock</p>
                <p className="text-[11px] text-rose-500/80">This product is currently unavailable. Update inventory to make it visible again.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}