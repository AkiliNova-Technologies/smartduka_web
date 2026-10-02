"use client";
import { Button } from "@/components/ui/button";
export { MarketingEntityCombobox } from "@/components/marketing/admin/marketing-entity-combobox";
import { FeaturedRankingList } from "@/components/marketing/featured-ranking-list";
import { ErrorState } from "@/components/marketplace/error-state";
import { useAdminMarketing } from "@/hooks/use-admin-marketing";
const marketingGroups = ["featured", "pickers"] as const;
export function FeaturedProductsManager() { const admin = useAdminMarketing({ groups: marketingGroups }); if (admin.loading) return <div className="h-64 animate-pulse rounded-xl bg-muted" />; if (admin.error) return <ErrorState title="Couldn't load featured products" actions={<Button onClick={() => void admin.refresh()}>Retry</Button>} />; return <FeaturedRankingList kind="product" title="Featured Products" description="Choose products SmartDuka should highlight and arrange the order customers see them." rows={(admin.featured?.products ?? []) as Array<{ id: string; [key: string]: unknown }>} options={(admin.pickers?.products ?? []).map((item) => ({ id: item.id, label: item.name }))} name={(row) => (row.product as { name?: string } | undefined)?.name ?? "Featured product"} emptyIllustration="/illustrations/empty-deals.svg" onAdd={(id) => admin.saveFeatured({ kind: "product", entityId: id })} onRemove={(id) => admin.removeFeatured("product", id)} onReorder={admin.reorderFeaturedProducts} onRefresh={admin.refreshFeatured} />; }
