"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { MediaImage } from "@/components/marketplace/media-image";
import { SHOP_BANNER_FALLBACK, SHOP_LOGO_FALLBACK } from "@/lib/media";
import type { PublicShopListing } from "@/lib/public-shop-dto";
import { ShopVerificationBadge } from "@/components/marketplace/shop-verification-badge";

export type MarketplaceVendor = PublicShopListing;

export function getShopInitials(storeName: string) {
  const initials = storeName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  return initials || "S";
}

export function formatFulfilmentSummary(methods: readonly ("DELIVERY" | "PICKUP")[]) {
  const delivery = methods.includes("DELIVERY");
  const pickup = methods.includes("PICKUP");
  if (delivery && pickup) return "Delivery & Pickup";
  if (delivery) return "Delivery";
  if (pickup) return "Pickup";
  return null;
}

export function VendorCard({ vendor, priority = false }: { vendor: MarketplaceVendor; priority?: boolean }) {
  const location = [vendor.city, vendor.country].filter(Boolean).join(", ");
  const fulfilment = formatFulfilmentSummary(vendor.fulfillmentMethods);

  return (
    <article className="h-full overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none hover:border-primary/40 hover:shadow-md">
      <Link href={`/shops/${vendor.slug}`} aria-label={`Visit ${vendor.storeName}`} className="group block h-full overflow-hidden rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <div className="relative aspect-[16/7] overflow-hidden bg-muted">
          <MediaImage src={vendor.bannerUrl} fallback={SHOP_BANNER_FALLBACK} alt={vendor.bannerUrl ? `${vendor.storeName} storefront` : ""} fill priority={priority} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px" className="object-cover transition-transform duration-300 motion-reduce:transition-none group-hover:scale-[1.02]" />
        </div>
        <div className="relative flex min-h-[168px] flex-col px-4 pb-4 pt-10">
          <div className="absolute -top-8 left-4 grid size-16 place-items-center overflow-hidden rounded-full border-4 border-card bg-muted text-base font-semibold tracking-tight text-primary shadow-sm">
            {vendor.logoUrl ? <MediaImage src={vendor.logoUrl} fallback={SHOP_LOGO_FALLBACK} alt={`${vendor.storeName} logo`} fill sizes="64px" className="object-cover" fallbackClassName="object-cover" /> : <span aria-label={`${vendor.storeName} initials`}>{getShopInitials(vendor.storeName)}</span>}
          </div>
          <div className="flex items-start gap-2">
            <h2 className="min-w-0 flex-1 line-clamp-2 text-[17px] font-semibold leading-5 tracking-tight text-foreground transition-colors group-hover:text-primary">{vendor.storeName}</h2>
            {vendor.isVerified ? <ShopVerificationBadge compact className="mt-0.5 shrink-0 px-1.5" /> : null}
          </div>
          {location ? <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin aria-hidden="true" className="size-3.5 shrink-0" /><span className="line-clamp-1">{location}</span></p> : null}
          {vendor.description ? <p className="mt-3 line-clamp-2 text-sm leading-5 text-muted-foreground">{vendor.description}</p> : null}
          <p className="mt-auto border-t border-border/70 pt-3 text-xs text-muted-foreground">
            {vendor.productCount ? `${vendor.productCount} ${vendor.productCount === 1 ? "product" : "products"}` : "No products yet"}{fulfilment ? ` · ${fulfilment}` : ""}
          </p>
        </div>
      </Link>
    </article>
  );
}
