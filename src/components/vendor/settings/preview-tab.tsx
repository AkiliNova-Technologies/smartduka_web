"use client";

import Image from "next/image";
import { Star, MapPin, Store } from "lucide-react";
import { IconRosetteDiscountCheckFilled } from "@tabler/icons-react";
import type { VendorProfile, Document } from "@prisma/client";

type FullVendorProfile = VendorProfile & {
  documents: Document[];
  _count: { products: number; subOrders: number };
};

interface PreviewTabProps {
  profile: FullVendorProfile;
}

export function PreviewTab({ profile }: PreviewTabProps) {
  const storeUrl = `/brands/${profile.slug}`;

  return (
    <div className="bg-card text-card-foreground border border-border/60 rounded-2xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:shadow-none overflow-hidden animate-in fade-in-50 duration-200">
      <div className="p-6 border-b border-border/60 bg-muted/30">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
          Live Storefront Preview
        </h3>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          See how your store appears to customers on the marketplace.
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Mini Store Card Preview */}
        <div className="max-w-sm mx-auto">
          <p className="text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase mb-3 text-center">
            Store Card Preview
          </p>
          <div className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-sm">
            {/* Banner */}
            <div className="aspect-[16/10] bg-zinc-100 dark:bg-zinc-800 relative">
              {profile.bannerUrl ? (
                <Image
                  src={profile.bannerUrl}
                  alt={profile.storeName}
                  fill
                  className="object-cover"
                  sizes="400px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-300 dark:text-zinc-600">
                  <Store className="w-8 h-8 opacity-40" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0">
                  {profile.logoUrl ? (
                    <Image
                      src={profile.logoUrl}
                      alt={profile.storeName}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Store className="w-4 h-4 text-zinc-400" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <h4 className="text-xs font-bold truncate">{profile.storeName}</h4>
                    {profile.documents.length > 0 && (
                      <IconRosetteDiscountCheckFilled className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                      <span className="text-[10px] font-bold">4.5</span>
                    </div>
                    <span className="text-[9px] text-muted-foreground">
                      {profile._count.products} products
                    </span>
                  </div>
                </div>
              </div>

              {profile.description && (
                <p className="text-[10px] text-muted-foreground line-clamp-2">
                  {profile.description}
                </p>
              )}

              <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <MapPin className="w-2.5 h-2.5" />
                {profile.city || "Kampala"}, {profile.country || "Uganda"}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Link */}
        <div className="text-center">
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-5 h-9 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-full text-xs font-bold hover:bg-primary dark:hover:bg-primary dark:hover:text-white transition-all active:scale-95"
          >
            Open Full Store Page
          </a>
        </div>
      </div>
    </div>
  );
}