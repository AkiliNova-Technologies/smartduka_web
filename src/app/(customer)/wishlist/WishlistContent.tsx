"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IllustratedEmptyState } from "@/components/marketplace/illustrated-empty-state";
import { useUserData } from "@/providers/UserDataProvider";
import { PageContainer } from "@/components/marketplace/page-container";
import { PageHeader } from "@/components/marketplace/page-header";
import { ProductCard } from "@/components/marketplace/product-card";
import { MarketplacePagination, MARKETPLACE_PAGE_SIZE } from "@/components/marketplace/marketplace-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { clampMarketplacePage } from "@/lib/marketplace-page";

export function WishlistPageFallback() {
  return <PageContainer className="py-8"><Skeleton className="h-20" /><div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="aspect-[.72] rounded-xl" />)}</div></PageContainer>;
}

export function WishlistContent({ requestedPage }: { requestedPage: number }) {
  const { wishlist, wishlistLoading } = useUserData();
  const router = useRouter();
  const pageCount = Math.max(1, Math.ceil(wishlist.length / MARKETPLACE_PAGE_SIZE));
  const page = clampMarketplacePage(requestedPage, pageCount);

  useEffect(() => {
    if (wishlistLoading || page === requestedPage) return;
    router.replace(page === 1 ? "/wishlist" : `/wishlist?page=${page}`);
  }, [page, requestedPage, router, wishlistLoading]);

  if (wishlistLoading && !wishlist.length) return <WishlistPageFallback />;

  const paginatedWishlist = wishlist.slice((page - 1) * MARKETPLACE_PAGE_SIZE, page * MARKETPLACE_PAGE_SIZE);
  return <PageContainer className="py-6 pb-24 sm:py-8"><PageHeader title="Wishlist" description="Products you’ve saved for later." context={wishlist.length ? `${wishlist.length} saved item${wishlist.length === 1 ? "" : "s"}` : undefined} />{!wishlist.length ? <div className="mt-8"><IllustratedEmptyState illustration="/illustrations/empty-wishlist.svg" title="Your wishlist is empty" description="Save products you like and come back to them anytime." action={{ label: "Browse products", href: "/products" }} size="standard" /></div> : <><div className="mt-6 flex items-center justify-between text-sm text-muted-foreground"><span>Ready when you are.</span><Link href="/products" className="font-semibold text-primary hover:underline">Continue shopping</Link></div><div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{paginatedWishlist.map((item) => <ProductCard key={item.productId} product={{ ...item, id: item.productId }} />)}</div><MarketplacePagination total={wishlist.length} /></>}</PageContainer>;
}
