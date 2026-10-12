"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MediaImage } from "@/components/marketplace/media-image";
import { ShopVerificationBadge } from "@/components/marketplace/shop-verification-badge";
import { getShopInitials } from "@/components/marketplace/vendor-card";
import { SHOP_BANNER_FALLBACK, SHOP_LOGO_FALLBACK } from "@/lib/media";
import type { FeaturedShopDto } from "@/lib/marketing-client";

export function FeaturedShopCard({ shop, priority = false }: { shop: FeaturedShopDto; priority?: boolean }) {
  return (
    <article className="group relative min-h-[25rem] overflow-hidden bg-muted text-white sm:min-h-[28rem] lg:min-h-[30rem]">
      <MediaImage
        src={shop.bannerUrl}
        fallback={SHOP_BANNER_FALLBACK}
        alt={shop.bannerUrl ? `${shop.storeName} shop cover` : ""}
        fill
        priority={priority}
        sizes="(max-width: 1280px) 100vw, 1280px"
        className="object-cover transition-transform duration-700 motion-reduce:transition-none group-hover:scale-[1.015]"
        fallbackClassName="object-cover"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/10 sm:from-black/75 sm:via-black/45 sm:to-transparent" />
      <Link
        href={`/shops/${shop.slug}`}
        aria-label={`Explore ${shop.storeName}`}
        className="relative z-10 flex min-h-[25rem] items-center px-6 py-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white sm:min-h-[28rem] sm:px-10 lg:min-h-[30rem] lg:px-14"
      >
        <div className="flex max-w-xl flex-col items-start">
          {shop.sponsored ? (
            <span className="mb-4 rounded-full border border-white/25 bg-black/35 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur-md">
              Sponsored
            </span>
          ) : null}
          <div className="relative grid size-16 place-items-center overflow-hidden rounded-2xl border-2 border-white/70 bg-white/15 text-lg font-bold tracking-tight text-white shadow-lg backdrop-blur-sm sm:size-[4.5rem]">
            {shop.logoUrl ? (
              <MediaImage src={shop.logoUrl} fallback={SHOP_LOGO_FALLBACK} alt={`${shop.storeName} logo`} fill sizes="72px" className="object-cover" fallbackClassName="object-cover" />
            ) : (
              <span aria-label={`${shop.storeName} initials`}>{getShopInitials(shop.storeName)}</span>
            )}
          </div>
          <div className="mt-4 flex min-w-0 max-w-full items-center gap-2.5">
            <h3 className="line-clamp-2 min-w-0 text-3xl font-bold leading-tight tracking-tight text-white drop-shadow-sm sm:text-4xl lg:text-5xl">
              {shop.storeName}
            </h3>
            {shop.isVerified ? <ShopVerificationBadge compact className="shrink-0 border border-white/20 bg-white/15 px-2 text-white backdrop-blur-sm" /> : null}
          </div>
          {shop.description ? <p className="mt-4 line-clamp-3 max-w-md text-sm leading-6 text-white/90 drop-shadow-sm sm:text-base sm:leading-7">{shop.description}</p> : null}
          <span className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm transition-[background-color,transform,box-shadow] group-hover:bg-[var(--primary-hover)] group-active:scale-[0.98] group-active:bg-[var(--primary-pressed)] group-focus-visible:shadow-[0_0_0_4px_var(--primary-focus)] motion-reduce:transition-none">
            Explore Store <ArrowRight aria-hidden="true" className="size-4" />
          </span>
        </div>
      </Link>
    </article>
  );
}
