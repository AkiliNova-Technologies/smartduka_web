"use client";
import { Button } from "@/components/ui/button";
export { MarketingEntityCombobox } from "@/components/marketing/admin/marketing-entity-combobox";
import { FeaturedRankingList } from "@/components/marketing/featured-ranking-list";
import { ErrorState } from "@/components/marketplace/error-state";
import { useAdminMarketing } from "@/hooks/use-admin-marketing";
const marketingGroups = ["featured", "pickers"] as const;
export function FeaturedShopsManager() {
  const admin = useAdminMarketing({ groups: marketingGroups });
  if (admin.loading)
    return <div className="h-64 animate-pulse rounded-xl bg-muted" />;
  if (admin.error)
    return (
      <ErrorState
        title="Couldn't load featured shops"
        actions={<Button onClick={() => void admin.refresh()}>Retry</Button>}
      />
    );
  return (
    <FeaturedRankingList
      kind="shop"
      title="Featured Shops"
      description="Choose shops SmartDuka should highlight and arrange the order customers see them."
      rows={
        (admin.featured?.shops ?? []) as Array<{
          id: string;
          [key: string]: unknown;
        }>
      }
      options={(admin.pickers?.shops ?? []).map((item) => ({
        id: item.id,
        label: item.storeName,
      }))}
      name={(row) =>
        (row.vendor as { storeName?: string } | undefined)?.storeName ??
        "Featured shop"
      }
      emptyIllustration="/illustrations/empty-shops.svg"
      onAdd={(id) => admin.saveFeatured({ kind: "shop", entityId: id })}
      onRemove={(id) => admin.removeFeatured("shop", id)}
      onReorder={admin.reorderFeaturedShops}
      onRefresh={admin.refreshFeatured}
    />
  );
}
