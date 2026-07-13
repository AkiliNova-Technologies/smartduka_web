"use client";

import { useState, useTransition } from "react";
import { ImageUpload } from "@/components/image-upload";
import { toast } from "sonner";
import { updateStoreLogo, updateStoreBanner } from "@/actions/vendor-settings";
import type { VendorProfile, Document } from "@prisma/client";

type FullVendorProfile = VendorProfile & {
  documents: Document[];
  _count: { products: number; subOrders: number };
};

interface StoreBrandingTabProps {
  profile: FullVendorProfile;
}

export function StoreBrandingTab({ profile }: StoreBrandingTabProps) {
  const [, startTransition] = useTransition();
  const [logoUrl, setLogoUrl] = useState(profile.logoUrl || "");
  const [bannerUrl, setBannerUrl] = useState(profile.bannerUrl || "");

  const handleLogoChange = (url: string) => {
    setLogoUrl(url);
    startTransition(async () => {
      const result = await updateStoreLogo(url);
      if (result.success) {
        toast.success("Store logo updated");
      } else {
        toast.error(result.error || "Failed to save logo");
        setLogoUrl(profile.logoUrl || "");
      }
    });
  };

  const handleBannerChange = (url: string) => {
    setBannerUrl(url);
    startTransition(async () => {
      const result = await updateStoreBanner(url);
      if (result.success) {
        toast.success("Store banner updated");
      } else {
        toast.error(result.error || "Failed to save banner");
        setBannerUrl(profile.bannerUrl || "");
      }
    });
  };

  return (
    <div className="bg-card text-card-foreground border border-border/60 rounded-2xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:shadow-none overflow-hidden animate-in fade-in-50 duration-200">
      <div className="p-6 border-b border-border/60 bg-muted/30">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
          Visual Branding
        </h3>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Upload your store logo and banner — these appear on your storefront and across the marketplace.
        </p>
      </div>

      <div className="p-6 space-y-8">
        {/* Store Logo */}
        <div className="space-y-3">
          <div>
            <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
              Store Logo
            </h4>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
              Square image displayed on product cards and store listings. Recommended: 500×500px.
            </p>
          </div>
          <div>
            <ImageUpload
              value={logoUrl}
              onChange={handleLogoChange}
              bucket="marketplace-images"
              folder={`vendors/${profile.id}/logo`}
              maxSizeInMB={2}
              className="w-full"
            />
          </div>
        </div>

        {/* Store Banner */}
        <div className="space-y-3">
          <div>
            <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
              Store Banner
            </h4>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
              Wide banner displayed at the top of your store page. Recommended: 1200×400px.
            </p>
          </div>
          <ImageUpload
            value={bannerUrl}
            onChange={handleBannerChange}
            bucket="marketplace-images"
            folder={`vendors/${profile.id}/banner`}
            maxSizeInMB={5}
            className="w-full"
          />
        </div>
      </div>

    </div>
  );
}