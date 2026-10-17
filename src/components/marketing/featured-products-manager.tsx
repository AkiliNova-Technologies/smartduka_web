"use client";
import { Button } from "@/components/ui/button";
import {
  FeaturedRankingList,
  type FeaturedRow,
} from "@/components/marketing/featured-ranking-list";
import { ErrorState } from "@/components/marketplace/error-state";
import {
  ProductCard,
  type MarketplaceProduct,
} from "@/components/marketplace/product-card";
import { useAdminMarketing } from "@/hooks/use-admin-marketing";
const marketingGroups = ["featured", "pickers"] as const;
function previewProduct(row: FeaturedRow): MarketplaceProduct | null {
  const product = row.product as Record<string, unknown> | undefined;
  if (!product) return null;
  const vendor = product.vendor as Record<string, unknown> | undefined;
  const images = product.images as Array<{ url?: string }> | undefined;
  return {
    id: String(product.id),
    name: String(product.name ?? "Featured product"),
    slug: String(product.slug ?? "preview"),
    brand: typeof product.brand === "string" ? product.brand : null,
    basePrice: Number(product.basePrice ?? 0),
    compareAtPrice:
      product.compareAtPrice == null ? null : Number(product.compareAtPrice),
    inventoryCount: Number(product.inventoryCount ?? 0),
    image: images?.[0]?.url ?? "",
    vendorId: String(product.vendorId ?? vendor?.id ?? ""),
    vendorName: String(vendor?.storeName ?? "Mwezora shop"),
    isPurchasable: Number(product.inventoryCount ?? 0) > 0,
  };
}
export function FeaturedProductsManager() {
  const admin = useAdminMarketing({ groups: marketingGroups });
  if (admin.loading)
    return <div className="h-64 animate-pulse rounded-xl bg-muted" />;
  if (admin.error)
    return (
      <ErrorState
        title="Couldn't load featured products"
        description="Try again to reload the curated product list."
        actions={<Button onClick={() => void admin.refresh()}>Retry</Button>}
      />
    );
  return (
    <FeaturedRankingList
      kind="product"
      title="Featured products"
      description="Choose curated products and arrange the order customers see. Paid sponsored placements remain separate."
      rows={(admin.featured?.products ?? []) as FeaturedRow[]}
      options={(admin.pickers?.products ?? []).map((item) => ({
        id: item.id,
        label: item.name,
      }))}
      name={(row) =>
        (row.product as { name?: string } | undefined)?.name ??
        "Featured product"
      }
      emptyIllustration="/illustrations/empty-deals.svg"
      renderPreview={(row) => {
        const product = previewProduct(row);
        return product ? (
          <div className="mx-auto max-w-sm">
            <ProductCard product={product} />
          </div>
        ) : null;
      }}
      onAdd={(id) => admin.saveFeatured({ kind: "product", entityId: id })}
      onRemove={(id) => admin.removeFeatured("product", id)}
      onReorder={admin.reorderFeaturedProducts}
      onRefresh={admin.refreshFeatured}
    />
  );
}
