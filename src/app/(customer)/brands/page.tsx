"use client";

import React from "react";
import {
  Store as StoreIcon,
  ArrowRight,
  Star,
  Layers,
  Heart,
  AlertTriangle,
  MapPin,
} from "lucide-react";
import { IconRosetteDiscountCheckFilled } from "@tabler/icons-react";
import Link from "next/link";
import Image from "next/image";
import { usePublicStores } from "@/hooks/use-vendor";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface StoreDisplay {
  id: string;
  name: string;
  logo: string;
  banner: string;
  slug: string;
  verified: boolean;
  rating: number;
  subscriptionPlan: string;
  totalProducts: number;
  description: string | null;
  city: string | null;
  country: string | null;
}

// ─── Skeleton card that mirrors the exact store card layout ───
function StoreCardSkeleton() {
  return (
    <div className="bg-card rounded-[24px] border border-border/60 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:border-zinc-800/80 dark:shadow-none flex flex-col overflow-hidden">
      {/* Image skeleton */}
      <div className="aspect-[16/10] m-2 mb-0 rounded-[18px] overflow-hidden">
        <Skeleton className="w-full h-full rounded-[18px]" />
      </div>

      {/* Content skeleton */}
      <div className="space-y-3 mt-4 px-5">
        <div className="flex items-center gap-2 pt-0.5">
          <Skeleton className="h-5 w-32 rounded-md" />
          <Skeleton className="h-4 w-4 rounded-full" />
        </div>
        <Skeleton className="h-3 w-20 rounded-md" />
        <div className="space-y-1.5 pt-1">
          <Skeleton className="h-3 w-full rounded-md" />
          <Skeleton className="h-3 w-3/4 rounded-md" />
        </div>
      </div>

      {/* Footer skeleton */}
      <div className="flex justify-between items-center mt-5 pt-4 px-5 pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-4 w-8 rounded-md" />
          </div>
          <Skeleton className="h-3 w-16 rounded-md" />
        </div>
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
    </div>
  );
}

// ─── Loading state — grid of 6 skeleton cards ───
function LoadingState() {
  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12 selection:bg-emerald-500/10 selection:text-emerald-700">
      {/* Header skeleton */}
      <div className="border-b border-border/60 pb-6 space-y-2">
        <Skeleton className="h-7 w-56 rounded-md" />
        <Skeleton className="h-3.5 w-96 rounded-md" />
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5 sm:gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <StoreCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// ─── Error state — branded card with retry ───
function ErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12 selection:bg-emerald-500/10 selection:text-emerald-700">
      {/* Header — keep visible so user knows where they are */}
      <div className="border-b border-border/60 pb-6 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Browse Trusted Dukas
        </h1>
        <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
          Find and shop directly from genuine sellers and boutiques registered
          on our platform.
        </p>
      </div>

      {/* Error card */}
      <div className="max-w-lg mx-auto">
        <div className="bg-card border border-border/60 rounded-[24px] shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:border-zinc-800/80 dark:shadow-none overflow-hidden">
          <div className="p-8 flex flex-col items-center text-center space-y-4">
            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                Couldn&apos;t load stores
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                We hit a snag while fetching the latest shops. This could be a
                temporary network hiccup — give it another try.
              </p>
            </div>

            {/* Error detail (collapsed by default feel) */}
            <div className="hidden w-full bg-muted/50 rounded-xl p-3 border border-border/40">
              <p className="text-[10px] font-mono text-muted-foreground break-all leading-relaxed">
                {error}
              </p>
            </div>

            {/* Retry button */}
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="rounded-full gap-2 px-5 text-xs font-bold">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ───
function EmptyState() {
  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12 selection:bg-emerald-500/10 selection:text-emerald-700">
      <div className="border-b border-border/60 pb-6 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Browse Trusted Dukas
        </h1>
        <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
          Find and shop directly from genuine sellers and boutiques registered
          on our platform.
        </p>
      </div>

      <div className="max-w-lg mx-auto">
        <div className="bg-card border border-border/60 rounded-[24px] shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:border-zinc-800/80 dark:shadow-none overflow-hidden">
          <div className="p-8 flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <StoreIcon className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                No stores available
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs">
                Check back soon — vendors are joining daily. Be the first to
                open your shop on SmartDuka.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page component ───
export default function BrandsPage() {
  const { stores: rawStores, isLoading, error } = usePublicStores();

  const stores: StoreDisplay[] = React.useMemo(() => {
    return rawStores
      .map((store) => ({
        id: store.id,
        name: store.storeName,
        logo:
          store.logoUrl ||
          store.products[0]?.images[0]?.url ||
          "/placeholder-store.png",
        banner: store.bannerUrl || "/placeholder-store.png",
        slug: store.slug,
        verified: false,
        rating: 4.5,
        subscriptionPlan: "Active Store",
        totalProducts: store._count.products,
        description: store.description,
        city: store.city,
        country: store.country,
      }))
      .sort((a, b) => b.totalProducts - a.totalProducts);
  }, [rawStores]);

  // Loading state — skeleton grid matching card layout
  if (isLoading) return <LoadingState />;

  // Error state — branded card with retry
  if (error) {
    return (
      <ErrorState error={error} onRetry={() => window.location.reload()} />
    );
  }

  // Empty state
  if (stores.length === 0) return <EmptyState />;

  // ─── Main content ───
  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 selection:bg-emerald-500/10 selection:text-emerald-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Browse Trusted Dukas
          </h1>
          <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
            Find and shop directly from genuine sellers and boutiques registered
            on our platform.
          </p>
        </div>
      </div>

      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5 sm:gap-6">
          {stores.map((store) => {
            const storeDescription =
              store.description ||
              `Discover authentic premium product lines managed directly by ${store.name}. Enjoy local Kampala speed-delivery and fully safe mobile money escrow support.`;

            return (
              <div
                key={store.id}
                className="group relative bg-card text-card-foreground rounded-[24px] border border-border/60 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:border-zinc-800/80 dark:shadow-none flex flex-col hover:shadow-[0_32px_64px_-8px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out cursor-pointer overflow-hidden">
                {/* Wishlist button */}
                <button className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm flex items-center justify-center text-zinc-400 dark:text-zinc-500 border border-border/40 dark:border-zinc-700 shadow-xs transition-all hover:text-rose-500 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-zinc-800 hover:scale-110 active:scale-90">
                  <Heart className="w-4 h-4" />
                </button>

                <Link
                  href={`/brands/${store.slug}`}
                  className="flex flex-col h-full flex-1">
                  {/* Banner — full-width, no internal margin */}
                  {/* Banner area */}
                  <div className="aspect-[16/10] bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden">
                    <Image
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      src={store.banner}
                      alt={store.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Verified badge — top-left on banner */}
                    {store.verified && (
                      <div className="absolute top-3 left-3 z-10">
                        <IconRosetteDiscountCheckFilled className="w-5 h-5 text-blue-600 dark:text-blue-400 drop-shadow-sm" />
                      </div>
                    )}

                    {/* Product count badge — bottom-left on banner */}
                    <div className="absolute bottom-3 left-3 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1 shadow-xs border border-border/20 z-10">
                      <Layers className="w-4 h-4 text-orange-500" />
                      <span>
                        {store.totalProducts} product
                        {store.totalProducts !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Info section */}
                  <div className="p-4 space-y-2 flex-1">
                    {/* Store identity row */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0 border border-border/30">
                        {store.logo ? (
                          <Image
                            src={store.logo}
                            alt={store.name}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <StoreIcon className="w-4 h-4 text-zinc-400" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate group-hover:text-primary transition-colors duration-200">
                          {store.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                            <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
                              {store.rating}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {store.description || storeDescription}
                    </p>

                    {/* Location — moved here from the bottom, replaces the old location row */}
                    <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                      <MapPin className="w-2.5 h-2.5" />
                      <span>
                        {store.city || "Kampala"}, {store.country || "Uganda"}
                      </span>
                    </div>
                  </div>
                </Link>

                {/* Footer CTA */}
                <div className="flex justify-between items-center px-4 pb-4 pt-0 relative z-10">
                  <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                    {store.subscriptionPlan}
                  </p>
                  <Link
                    href={`/brands/${store.slug}`}
                    className="inline-flex items-center justify-center gap-1.5 h-9 px-4 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-full text-xs font-bold shadow-xs transition-all duration-200 hover:bg-primary dark:hover:bg-primary dark:hover:text-white hover:gap-2 active:scale-95">
                    <span>Enter Store</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
