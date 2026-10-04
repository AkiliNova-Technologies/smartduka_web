"use client";

import { MediaImage } from "@/components/marketplace/media-image";
import { SHOP_BANNER_FALLBACK, SHOP_LOGO_FALLBACK } from "@/lib/media";
import Link from "next/link";
import { MapPin, Package, Store, Star } from "lucide-react";
import { useState } from "react";
import { PageContainer } from "@/components/marketplace/page-container";
import { PaginatedProductGrid } from "@/components/marketplace/product-grid";
import { EmptyState } from "@/components/marketplace/empty-state";
import { IllustratedEmptyState } from "@/components/marketplace/illustrated-empty-state";
import { StatusBadge } from "@/components/marketplace/status-badge";
import type { MarketplaceProduct } from "@/components/marketplace/product-card";
import { ReviewEntryPoint } from "@/components/reviews/ReviewEntryPoint";

interface StoreData {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  banner: string | null;
  verified: boolean;
  description: string | null;
  city: string | null;
  country: string | null;
  returnWindowDays: number;
  returnPolicy: string | null;
  acceptsExchanges: boolean;
  exchangePolicy: string | null;
  totalProducts: number;
  rating: number;
  reviewCount: number;
  reviews: { id: string; rating: number; comment: string | null; customer: string; reply: string | null; createdAt: string }[];
}
interface Props {
  store: StoreData;
  products: MarketplaceProduct[];
  categories: { id: string; name: string }[];
}
export function StoreProfileContent({ store, products, categories }: Props) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const filtered =
    selectedCategory === "all"
      ? products
      : products.filter(
          (product) =>
            (product as MarketplaceProduct & { categoryId?: string | null })
              .categoryId === selectedCategory,
        );
  return (
    <PageContainer className="py-6 sm:py-8">
      <div className="space-y-7">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <Link href="/shops" className="hover:text-primary">
            Shops
          </Link>
          <span className="mx-2">/</span>
          <span aria-current="page" className="text-foreground">
            {store.name}
          </span>
        </nav>
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="relative aspect-[5/1] min-h-28 bg-muted">
            <MediaImage src={store.banner} fallback={SHOP_BANNER_FALLBACK} alt="" fill sizes="(max-width: 1280px) 100vw, 1280px" className="object-cover" />
          </div>
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:p-7">
            <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-50 text-xl font-bold text-primary dark:bg-emerald-950/30">
              <MediaImage src={store.logo} fallback={SHOP_LOGO_FALLBACK} alt={`${store.name} logo`} fill sizes="80px" className="object-cover" fallbackClassName="object-cover" />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  {store.name}
                </h1>
                {store.verified ? (
                  <StatusBadge tone="info">Verified shop</StatusBadge>
                ) : null}
              </div>
              {store.description ? (
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  {store.description}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Package className="size-4" />
                  {store.totalProducts} products
                </span>
                <span className="inline-flex items-center gap-1.5"><Star className="size-4 fill-amber-400 text-amber-400" />{store.reviewCount ? `${store.rating.toFixed(1)} (${store.reviewCount} reviews)` : "No shop reviews yet"}</span>
                {store.city ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-4" />
                    {store.city}
                    {store.country ? `, ${store.country}` : ""}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </section>
        <section className="rounded-xl border bg-card p-5" aria-labelledby="returns-policy"><h2 id="returns-policy" className="text-lg font-semibold">Returns & refunds</h2><p className="mt-2 text-sm text-muted-foreground">Returns can be requested within {store.returnWindowDays} days of delivery. Platform customer protection always applies.</p>{store.returnPolicy ? <p className="mt-2 text-sm text-muted-foreground">{store.returnPolicy}</p> : null}{store.acceptsExchanges ? <><p className="mt-2 text-sm font-medium text-foreground">This shop also offers exchanges where suitable.</p>{store.exchangePolicy ? <p className="mt-2 text-sm text-muted-foreground">{store.exchangePolicy}</p> : null}</> : null}</section>
        <section className="rounded-xl border bg-card p-5" aria-labelledby="shop-reviews">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="shop-reviews" className="text-xl font-semibold">Shop reviews</h2>
            <ReviewEntryPoint kind="shop" resourceId={store.id} label={store.name} showEligibilityMessage={false} />
          </div>
          {store.reviews.length ? (
            <div className="mt-4 rounded-xl border p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-3 border-b pb-4">
                <span className="text-3xl font-semibold">{store.rating.toFixed(1)}</span>
                <span className="flex items-center gap-1 text-sm text-amber-500"><Star className="size-4 fill-current" />{store.reviewCount} {store.reviewCount === 1 ? "review" : "reviews"}</span>
              </div>
              <div className="mt-4 space-y-4">
                {store.reviews.slice(0, 5).map((review) => <article key={review.id} className="border-b pb-4 last:border-0 last:pb-0"><div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"><span className="font-medium">{review.customer}</span><span className="flex gap-0.5 text-amber-500">{Array.from({ length: review.rating }).map((_, index) => <Star key={index} className="size-3 fill-current" />)}</span><span className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" })}</span></div>{review.comment ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{review.comment}</p> : null}{review.reply ? <p className="mt-3 rounded-lg bg-muted p-3 text-sm"><span className="font-medium">Shop reply: </span>{review.reply}</p> : null}</article>)}
              </div>
            </div>
          ) : (
            <div className="mt-4 flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed px-5 py-6 text-center">
              <MediaImage src="/illustrations/empty-notifications.svg" fallback="/illustrations/empty-shops.svg" alt="" width={112} height={88} className="h-20 w-24 object-contain opacity-80" />
              <h3 className="mt-3 font-semibold">No shop reviews yet</h3>
              <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">Be the first verified customer to share your experience with this shop.</p>
            </div>
          )}
        </section>
        <section className="space-y-5" aria-labelledby="shop-products">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                id="shop-products"
                className="text-xl font-semibold tracking-tight"
              >
                Shop products
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Products listed by {store.name}.
              </p>
            </div>
          </div>
          {categories.length ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium ${selectedCategory === "all" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}
              >
                All ({products.length})
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium ${selectedCategory === category.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          ) : null}
          {!products.length ? (
            <IllustratedEmptyState
              illustration="/illustrations/empty-products.svg"
              title="This shop has no products yet"
              description={`Check back later for new items from ${store.name}.`}
              action={{ label: "Browse other shops", href: "/shops" }}
              size="standard"
            />
          ) : filtered.length ? (
            <PaginatedProductGrid products={filtered} />
          ) : (
            <EmptyState
              icon={Store}
              title="No products in this category"
              description="Try another category or view all products from this shop."
              actions={<button onClick={() => setSelectedCategory("all")} className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground dark:text-white">View all products</button>}
            />
          )}
        </section>
      </div>
    </PageContainer>
  );
}
