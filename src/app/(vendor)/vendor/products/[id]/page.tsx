"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit2, Box, Sparkles, AlertTriangle, TrendingDown } from "lucide-react";
import { mockDatabase } from "@/data/mockDatabase";
import { cn } from "@/lib/utils";

export default function VendorProductPreviewPage() {
  const params = useParams();

  const product = React.useMemo(() => {
    return mockDatabase.products.find((p) => p.id === params.id);
  }, [params.id]);

  if (!product) {
    return (
      <div className="py-12 text-center text-xs font-semibold text-muted-foreground select-none">
        Product information token not found in runtime database.
      </div>
    );
  }

  // Calculate markdown metrics if applicable
  const markdownPercentage = product.originalPrice 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) 
    : 0;

  const isLowStock = (product.inventoryCount ?? 0) <= 5;

  return (
    <div className="space-y-6 max-w-8xl mx-auto">
      
      {/* ACTION TOP HEADER CONFIGURATION BLOCK */}
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
              <h1 className="text-xl font-medium tracking-tight text-foreground">Catalog Insights</h1>
              <span className="text-[10px] bg-muted border border-border/60 text-muted-foreground font-medium font-mono px-2 py-0.5 rounded-md">
                {product.id}
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Live storefront display indexing parameters and structural metrics monitoring.
            </p>
          </div>
        </div>

        <Link 
          href={`/vendor/products/${product.id}/edit`}
          className="h-9 px-4 bg-primary text-primary-foreground text-xs font-medium rounded-xl hover:bg-emerald-600 active:scale-95 transition-all flex items-center gap-1.5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)]"
        >
          <Edit2 className="w-3.5 h-3.5" />
          <span>Edit Product</span>
        </Link>
      </div>

      {/* CORE INFO SUMMARY GRID BOX SPLIT */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* LARGE COVER PREVIEW BLOCK */}
        <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)]">
          <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-muted border border-border/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={product.image} 
              alt={product.title} 
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* COMPREHENSIVE REVENUE & METRIC MONITORING LAYER */}
        <div className="md:col-span-2 space-y-4">
          
          {/* Main details meta frame */}
          <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-3 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)]">
            <div className="space-y-1 select-none">
              <span className="text-[10px] font-medium text-primary border border-primary/20 bg-primary/5 px-2 py-0.5 rounded-md uppercase tracking-wider">
                {product.brand || "Independent Manufacturer"}
              </span>
              <h2 className="text-lg font-medium text-foreground tracking-tight pt-1 leading-snug">
                {product.title}
              </h2>
            </div>

            <div className="border-t border-border/40 pt-3 flex items-baseline gap-3">
              <span className="text-xl font-extrabold text-foreground tracking-tight">
                UGX {product.price.toLocaleString()}
              </span>
              {product.originalPrice && (
                <>
                  <span className="text-xs text-muted-foreground font-medium line-through">
                    UGX {product.originalPrice.toLocaleString()}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[10px] bg-emerald-500/5 text-emerald-500 font-extrabold border border-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    <TrendingDown className="w-2.5 h-2.5" />
                    {markdownPercentage}% Price Drop Saved
                  </span>
                </>
              )}
            </div>
          </div>

          {/* STOCK MONITORING CONTROL CAPSULED STATUS BLOCKS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 select-none">
            
            <div className="bg-card border border-border/60 rounded-2xl p-5 flex items-center justify-between shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)]">
              <div className="space-y-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Current Stock Volume</span>
                <p className="text-lg font-medium text-foreground">{product.inventoryCount ?? 0} units pooled</p>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-100 border border-border/40 dark:bg-zinc-900 text-muted-foreground">
                <Box className="w-5 h-5 stroke-[2]" />
              </div>
            </div>

            <div className={cn(
              "border rounded-2xl p-5 flex items-center justify-between shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)] transition-colors",
              isLowStock 
                ? "bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-500" 
                : "bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-500"
            )}>
              <div className="space-y-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block">Supply Pipeline Health</span>
                <p className="text-sm font-medium tracking-tight">
                  {isLowStock ? "Critical Stock Level Warning" : "Optimal Stock Balance"}
                </p>
              </div>
              <div className="p-2.5 rounded-xl border border-current/10 bg-background/50">
                {isLowStock ? <AlertTriangle className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}