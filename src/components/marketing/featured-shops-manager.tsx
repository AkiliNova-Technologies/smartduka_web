"use client";
import { Button } from "@/components/ui/button";
import {
  FeaturedRankingList,
  type FeaturedRow,
} from "@/components/marketing/featured-ranking-list";
import { FeaturedShopCard } from "@/components/marketing/featured-shop-card";
import { ErrorState } from "@/components/marketplace/error-state";
import type { FeaturedShopDto } from "@/lib/marketing-client";
import { useAdminMarketing } from "@/hooks/use-admin-marketing";
const marketingGroups = ["featured", "pickers"] as const;
function previewShop(row: FeaturedRow): FeaturedShopDto | null {
  const vendor = row.vendor as Record<string, unknown> | undefined;
  if (!vendor) return null;
  const count = vendor._count as { products?: number } | undefined;
  const methods = Array.isArray(vendor.fulfillmentMethods)
    ? vendor.fulfillmentMethods.filter(
        (method): method is "DELIVERY" | "PICKUP" =>
          method === "DELIVERY" || method === "PICKUP",
      )
    : [];
  return {
    id: String(vendor.id),
    storeName: String(vendor.storeName ?? "Featured shop"),
    slug: String(vendor.slug ?? "preview"),
    logoUrl: typeof vendor.logoUrl === "string" ? vendor.logoUrl : null,
    bannerUrl: typeof vendor.bannerUrl === "string" ? vendor.bannerUrl : null,
    description:
      typeof vendor.description === "string" ? vendor.description : null,
    city: typeof vendor.city === "string" ? vendor.city : null,
    country: typeof vendor.country === "string" ? vendor.country : null,
    isVerified: vendor.verificationStatus === "VERIFIED",
    fulfillmentMethods: methods,
    deliveryFee: vendor.deliveryFee == null ? null : Number(vendor.deliveryFee),
    deliveryEstimate:
      typeof vendor.deliveryEstimate === "string"
        ? vendor.deliveryEstimate
        : null,
    productCount: Number(count?.products ?? 0),
    sponsored: false,
  };
}
export function FeaturedShopsManager() {
  const admin = useAdminMarketing({ groups: marketingGroups });
  if (admin.loading)
    return <div className="h-64 animate-pulse rounded-xl bg-muted" />;
  if (admin.error)
    return (
      <ErrorState
        title="Couldn't load featured shops"
        description="Try again to reload the curated shop list."
        actions={<Button onClick={() => void admin.refresh()}>Retry</Button>}
      />
    );
  return (
    <FeaturedRankingList
      kind="shop"
      title="Featured shops"
      description="Choose curated shops and arrange their customer-facing order. Paid sponsored placements remain separate."
      rows={(admin.featured?.shops ?? []) as FeaturedRow[]}
      options={(admin.pickers?.shops ?? []).map((item) => ({
        id: item.id,
        label: item.storeName,
      }))}
      name={(row) =>
        (row.vendor as { storeName?: string } | undefined)?.storeName ??
        "Featured shop"
      }
      emptyIllustration="/illustrations/empty-shops.svg"
      renderPreview={(row) => {
        const shop = previewShop(row);
        return shop ? <FeaturedShopCard shop={shop} /> : null;
      }}
      onAdd={(id) => admin.saveFeatured({ kind: "shop", entityId: id })}
      onRemove={(id) => admin.removeFeatured("shop", id)}
      onReorder={admin.reorderFeaturedShops}
      onRefresh={admin.refreshFeatured}
    />
  );
}
