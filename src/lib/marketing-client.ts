import type {
  PromotionCtaType,
  PromotionPlacement,
  PromotionStatus,
} from "@prisma/client";

export type PublicPromotion = {
  id: string;
  title: string;
  subtitle: string | null;
  desktopImageUrl: string;
  mobileImageUrl: string | null;
  primaryCtaLabel: string | null;
  primaryHref: string | null;
  secondaryCtaLabel: string | null;
  secondaryHref: string | null;
};
export type FeaturedProductDto = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  basePrice: number;
  compareAtPrice: number | null;
  inventoryCount: number;
  image: string;
  vendorId: string;
  vendorName: string;
  category: { id: string; name: string; slug: string } | null;
};
export type FeaturedShopDto = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  description: string | null;
  city: string | null;
  country: string | null;
  productCount: number;
  verified: boolean;
};
export type PromotionDto = PublicPromotion & {
  status: PromotionStatus;
  priority: number;
  startsAt?: string | null;
  endsAt?: string | null;
  placements?: PromotionPlacement[];
};
export type PromotionMutation = {
  title: string;
  subtitle?: string | null;
  desktopImageUrl: string;
  mobileImageUrl?: string | null;
  status?: PromotionStatus;
  priority?: number;
  startsAt?: string | null;
  endsAt?: string | null;
  placements: PromotionPlacement[];
  primaryCtaLabel?: string | null;
  primaryCtaType?: PromotionCtaType | null;
  primaryCtaValue?: string | null;
  secondaryCtaLabel?: string | null;
  secondaryCtaType?: PromotionCtaType | null;
  secondaryCtaValue?: string | null;
};

export class MarketingClientError extends Error {
  constructor(message: string, public readonly code?: string, public readonly status?: number, public readonly fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "MarketingClientError";
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await response.json().catch(() => null) as { success?: boolean; error?: string; message?: string; code?: string; errors?: Record<string, string>; data?: T } | null;
  if (!response.ok || !body?.success) {
    throw new MarketingClientError(body?.error ?? body?.message ?? "Marketing request failed.", body?.code, response.status, body?.errors);
  }
  return body.data as T;
}
export const marketingClient = {
  getPromotions: (placement: PromotionPlacement, signal?: AbortSignal) =>
    request<{ promotions: PublicPromotion[] }>(`/api/marketing/${placement}`, {
      signal,
    }),
  getFeatured: (signal?: AbortSignal) =>
    request<{ products: FeaturedProductDto[]; shops: FeaturedShopDto[] }>(
      "/api/marketing/featured",
      { signal },
    ),
  getAdminPromotions: () =>
    request<{ promotions: PromotionDto[] }>("/api/admin/marketing/promotions"),
  getAdminFeatured: () =>
    request<{ products: unknown[]; shops: unknown[] }>(
      "/api/admin/marketing/featured",
    ),
  getPickers: () =>
    request<{
      products: { id: string; name: string }[];
      shops: { id: string; storeName: string }[];
      categories: { id: string; name: string }[];
    }>("/api/admin/marketing/pickers"),
  createPromotion: (input: PromotionMutation) =>
    request<PromotionDto>("/api/admin/marketing/promotions", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updatePromotion: (id: string, input: PromotionMutation) =>
    request<PromotionDto>("/api/admin/marketing/promotions", {
      method: "PATCH",
      body: JSON.stringify({ id, ...input }),
    }),
  setPromotionStatus: (id: string, status: PromotionStatus) =>
    request<PromotionDto>("/api/admin/marketing/promotions", {
      method: "PATCH",
      body: JSON.stringify({ id, status }),
    }),
  saveFeatured: (input: {
    kind: "product" | "shop";
    entityId: string;
    priority?: number;
    isActive?: boolean;
    startsAt?: string | null;
    endsAt?: string | null;
  }) =>
    request<unknown>("/api/admin/marketing/featured", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  reorderFeaturedProducts: (orderedIds: string[]) =>
    request<unknown[]>("/api/admin/marketing/featured", { method: "PATCH", body: JSON.stringify({ kind: "product", orderedIds }) }),
  reorderFeaturedShops: (orderedIds: string[]) =>
    request<unknown[]>("/api/admin/marketing/featured", { method: "PATCH", body: JSON.stringify({ kind: "shop", orderedIds }) }),
  removeFeatured: (kind: "product" | "shop", id: string) =>
    request<{ deleted: boolean }>("/api/admin/marketing/featured", {
      method: "DELETE",
      body: JSON.stringify({ kind, id }),
    }),
};
