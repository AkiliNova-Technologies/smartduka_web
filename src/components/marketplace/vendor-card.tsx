"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { IconRosetteDiscountCheckFilled } from "@tabler/icons-react";
import { MediaImage } from "@/components/marketplace/media-image";
import { SHOP_BANNER_FALLBACK, SHOP_LOGO_FALLBACK } from "@/lib/media";

export type MarketplaceVendor = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  bannerUrl?: string | null;
  description: string | null;
  city: string | null;
  country: string | null;
  productCount: number;
  verified?: boolean;
};

export function VendorCard({ vendor, priority = false }: { vendor: MarketplaceVendor; priority?: boolean }) {
  const location = [vendor.city, vendor.country].filter(Boolean).join(", ");

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/35">
      <Link
        href={`/shops/${vendor.slug}`}
        className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <div className="relative h-28 overflow-hidden bg-zinc-100 dark:bg-zinc-900 sm:h-32">
          <MediaImage
            src={vendor.bannerUrl}
            fallback={SHOP_BANNER_FALLBACK}
            alt=""
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
            className="object-cover"
          />
        </div>
        <div className="relative px-4 pb-4 pt-8">
          <div className="absolute -top-7 left-4 grid size-14 place-items-center overflow-hidden rounded-xl border-2 border-card bg-zinc-100 text-muted-foreground dark:bg-zinc-800">
            <MediaImage
              src={vendor.logoUrl}
              fallback={SHOP_LOGO_FALLBACK}
              alt={`${vendor.name} logo`}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
              className="object-cover"
              fallbackClassName="object-cover"
            />
          </div>
          <div className="flex items-start gap-2">
            <h2 className="min-w-0 flex-1 line-clamp-1 text-wrap text-[17px] font-semibold leading-5 tracking-tight text-foreground group-hover:text-primary">
              {vendor.name}
            </h2>
            {vendor.verified && (
              <span
                title="Verified shop"
                className="mt-0.5 shrink-0 text-blue-500">
                <IconRosetteDiscountCheckFilled
                  aria-label="Verified shop"
                  className="size-4"
                />
              </span>
            )}
          </div>
          {location && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin aria-hidden="true" className="size-3.5" />
              {location}
            </p>
          )}
          {vendor.description && (
            <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
              {vendor.description}
            </p>
          )}
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/70 pt-3 text-sm">
            <span className="text-muted-foreground">
              {vendor.productCount}{" "}
              {vendor.productCount === 1 ? "product" : "products"}
            </span>
            <span className="shrink-0 font-semibold text-primary">
              Visit shop <span aria-hidden="true">→</span>
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
