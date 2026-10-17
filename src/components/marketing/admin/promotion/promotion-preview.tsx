import { ImageIcon } from "lucide-react";
import type { PromotionFormValue } from "./types";
import { HeroCarousel } from "@/components/marketing/promotion-carousel";
import { MarketingPreviewEmpty, MarketingPreviewShell } from "@/components/marketing/admin/marketing-preview-shell";

export function PromotionPreview({ form }: { form: PromotionFormValue }) {
  const hasContent = Boolean(form.title.trim() || form.desktopImageUrl.trim());
  return (
    <MarketingPreviewShell
      title="Homepage hero preview"
      description="Desktop and mobile use the same presentation customers see."
      empty={!hasContent ? <MarketingPreviewEmpty illustration={<ImageIcon aria-hidden="true" className="size-8 text-muted-foreground" />} title="Your next featured story starts here" description="Add your banner image and content to see how it will appear on the Mwezora homepage." /> : undefined}
    >
      {hasContent ? <HeroCarousel size="compact" slides={[{
        id: "admin-preview",
        title: form.title.trim() || "Your promotion headline",
        description: form.subtitle?.trim() || "Add supporting text to give customers more context.",
        ctaLabel: form.primaryCtaLabel?.trim() || "Explore offer",
        href: "#preview",
        desktopImage: form.desktopImageUrl || "/illustrations/empty-deals.svg",
        mobileImage: form.mobileImageUrl || form.desktopImageUrl || "/illustrations/empty-deals.svg",
        imageAlt: form.title.trim() || "Promotion preview",
        textScrim: true,
      }]} /> : null}
    </MarketingPreviewShell>
  );
}
