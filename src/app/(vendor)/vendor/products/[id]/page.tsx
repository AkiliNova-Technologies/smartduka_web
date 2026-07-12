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
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProducts } from "@/hooks/use-products";
import type { Product } from "@/types/marketplace";

export default function VendorProductPreviewPage() {
  const params = useParams();
  const productId = typeof params.id === "string" ? params.id : null;

  const { fetchProductById } = useProducts();

  const [product, setProduct] = React.useState<Product | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!productId) return;

    let cancelled = false;

    // Defer state updates to a microtask, avoiding synchronous setState in effect
    queueMicrotask(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchProductById(productId);
        if (!cancelled) {
          setProduct(data);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load product.");
          setLoading(false);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [productId, fetchProductById]);

  // MISSING PRODUCT ID – show error immediately, no effect needed
  if (!productId) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
        <div className="p-4 rounded-full bg-muted/50">
          <Package className="w-8 h-8 text-muted-foreground/40" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-foreground">Invalid Product</h3>
          <p className="text-xs text-muted-foreground">Missing product identifier.</p>
        </div>
        <Link href="/vendor/products" className="text-xs font-medium text-primary hover:underline">
          Back to Products
        </Link>
      </div>
    );
  }

  // LOADING STATE
  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Loading product details...</p>
      </div>
    );
  }

  // ERROR STATE
  if (error) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
        <div className="p-4 rounded-full bg-muted/50">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-foreground">Error Loading Product</h3>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
        <Link href="/vendor/products" className="text-xs font-medium text-primary hover:underline">
          Back to Products
        </Link>
      </div>
    );
  }

  // NOT FOUND STATE
  if (!product) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
        <div className="p-4 rounded-full bg-muted/50">
          <Package className="w-8 h-8 text-muted-foreground/40" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-foreground">Product Not Found</h3>
          <p className="text-xs text-muted-foreground">Product information not available.</p>
        </div>
        <Link href="/vendor/products" className="text-xs font-medium text-primary hover:underline">
          Back to Products
        </Link>
      </div>
    );
  }

  // ---------- Product display (unchanged) ----------
  const basePrice: number = product.basePrice ?? 0;
  const compareAtPrice: number | undefined = product.compareAtPrice ?? undefined;
  const productName: string = product.name ?? "";
  const inventoryCount: number = product.inventoryCount ?? 0;
  const rating: number = product.rating ?? 0;
  const reviews: number = product.reviews ?? 0;
  const brand: string = product.brand ?? "Independent Manufacturer";
  const sku: string = product.sku ?? product.id?.slice(0, 8) ?? "N/A";

  const markdownPercentage = compareAtPrice
    ? Math.round(((compareAtPrice - basePrice) / compareAtPrice) * 100)
    : 0;

  const isLowStock = inventoryCount <= 5 && inventoryCount > 0;
  const isOutOfStock = inventoryCount === 0;

  const specs = [
    { name: "Manufacturer", value: "Nike International" },
    { name: "Primary Material", value: "Dura-Mesh Fabric & Synthetic Leather" },
    { name: "Origin", value: "Made in Vietnam / Imported" },
    { name: "Weight", value: "340g per unit" },
  ];

  return (
    <div className="space-y-6 max-w-8xl mx-auto animate-in fade-in duration-300">
      
      {/* ACTION TOP HEADER */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4 select-none">
        <div className="flex items-center gap-3">
          <Link
            href="/vendor/products"
            className="p-2 border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-medium tracking-tight text-foreground">
                {productName}
              </h1>
              <span className={cn(
                "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                isOutOfStock
                  ? "bg-rose-500/5 border-rose-500/10 text-rose-600"
                  : isLowStock
                  ? "bg-amber-500/5 border-amber-500/10 text-amber-600"
                  : "bg-emerald-500/5 border-emerald-500/10 text-emerald-600"
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
            className="h-9 px-4 border border-border/60 hover:bg-muted text-xs font-medium rounded-full transition-all flex items-center gap-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>View Storefront</span>
          </Link>
          <Link
            href={`/vendor/products/${product.id}/edit`}
            className="h-9 px-4 bg-primary text-primary-foreground text-xs font-medium rounded-full hover:bg-emerald-600 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Product</span>
          </Link>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN - Image & Quick Stats */}
        <div className="lg:col-span-4 space-y-4">
          {/* Product Image */}
          <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)]">
            <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-muted border border-border/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.image}
                alt={productName}
                className="w-full h-full object-cover"
              />
              {markdownPercentage > 0 && (
                <span className="absolute top-3 left-3 bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                  -{markdownPercentage}% OFF
                </span>
              )}
            </div>
          </div>

          {/* Quick Stats Cards */}
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
              <p className={cn(
                "text-lg font-medium",
                isOutOfStock ? "text-rose-500" : isLowStock ? "text-amber-500" : "text-foreground"
              )}>
                {inventoryCount}
              </p>
              <p className="text-[10px] text-muted-foreground">units available</p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - Product Details */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Pricing & Brand Card */}
          <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)]">
            {/* Brand & Name */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-md uppercase tracking-wider inline-block">
                {brand}
              </span>
              <h2 className="text-lg font-medium text-foreground tracking-tight pt-1">
                {productName}
              </h2>
            </div>

            {/* Price Section */}
            <div className="border-t border-border/40 pt-3 flex items-baseline gap-3 flex-wrap">
              <span className="text-2xl font-extrabold text-foreground tracking-tight">
                UGX {basePrice.toLocaleString()}
              </span>
              {compareAtPrice && (
                <>
                  <span className="text-sm text-muted-foreground font-medium line-through">
                    UGX {compareAtPrice.toLocaleString()}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/5 text-emerald-600 font-extrabold border border-emerald-500/10 px-2 py-0.5 rounded-full">
                    <TrendingDown className="w-2.5 h-2.5" />
                    Save {markdownPercentage}%
                  </span>
                </>
              )}
            </div>

            {/* Key Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border/40">
              <div className="space-y-0.5">
                <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">SKU</span>
                <p className="text-xs font-mono font-medium text-foreground">{sku}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Category</span>
                <p className="text-xs font-medium text-foreground truncate">Footwear</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Store</span>
                <p className="text-xs font-medium text-foreground truncate">Main Store</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Status</span>
                <span className={cn(
                  "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                  isOutOfStock
                    ? "bg-rose-500/5 border-rose-500/10 text-rose-600"
                    : isLowStock
                    ? "bg-amber-500/5 border-amber-500/10 text-amber-600"
                    : "bg-emerald-500/5 border-emerald-500/10 text-emerald-600"
                )}>
                  {isOutOfStock ? "Out of Stock" : isLowStock ? "Low Stock" : "Active"}
                </span>
              </div>
            </div>
          </div>

          {/* Variants & Specifications Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Variants Card */}
            <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Variants</h3>
              </div>
              
              <div className="space-y-2">
                <span className="text-[10px] font-medium text-muted-foreground">Available Sizes</span>
                <div className="flex flex-wrap gap-1.5">
                  {["S", "M", "L", "XL"].map((size) => (
                    <span key={size} className="px-2.5 py-1 bg-muted/50 border border-border/40 rounded-md text-[11px] font-medium text-foreground">
                      {size}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-medium text-muted-foreground">Available Colors</span>
                <div className="flex flex-wrap gap-1.5">
                  {["Black/White", "Navy Blue", "Red"].map((color) => (
                    <span key={color} className="px-2.5 py-1 bg-muted/50 border border-border/40 rounded-md text-[11px] font-medium text-foreground">
                      {color}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Specifications Card */}
            <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Specifications</h3>
              </div>
              
              <div className="space-y-2">
                {specs.map((spec, index) => (
                  <div key={index} className={cn(
                    "flex justify-between items-center py-1.5 px-2 rounded-lg text-xs",
                    index % 2 === 0 ? "bg-muted/20" : ""
                  )}>
                    <span className="text-muted-foreground font-medium">{spec.name}</span>
                    <span className="font-medium text-foreground text-right max-w-[140px] truncate">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Description & Tags */}
          <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)]">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Description</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Premium engineering matched with elite craftsmanship provides complete agility and comfort. 
                Featuring responsive dual cushioning layers and high-tensile breathability architectures 
                tailored for active city grids or rugged trail pathways.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/40">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tags</h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["sneakers", "running", "nike", "sportswear", "athletic"].map((tag) => (
                  <span key={tag} className="px-2.5 py-1 bg-primary/5 border border-primary/10 rounded-full text-[10px] font-medium text-primary">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Stock Health Alert */}
          {isLowStock && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-amber-600">Low Stock Warning</p>
                <p className="text-[11px] text-amber-500/80">
                  Only {inventoryCount} units remaining. Consider restocking soon to avoid missing sales.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}