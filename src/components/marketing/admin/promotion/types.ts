import type { PromotionCtaType } from "@prisma/client";
import type { PromotionMutation } from "@/lib/marketing-client";
export type PromotionFormValue = PromotionMutation & { startsAt: string; endsAt: string };
export const emptyPromotion: PromotionFormValue = { title: "", subtitle: "", desktopImageUrl: "", mobileImageUrl: "", status: "DRAFT", priority: 100, placements: ["HOMEPAGE"], primaryCtaLabel: "", primaryCtaType: null, primaryCtaValue: "", secondaryCtaLabel: "", secondaryCtaType: null, secondaryCtaValue: "", startsAt: "", endsAt: "" };
export const ctaTypes: PromotionCtaType[] = ["PRODUCT", "SHOP", "CATEGORY", "INTERNAL_PATH", "EXTERNAL_URL"];
export type PickerData = { products: { id: string; name: string }[]; shops: { id: string; storeName: string }[]; categories: { id: string; name: string }[] } | null;
export type Change = <K extends keyof PromotionFormValue>(key: K, value: PromotionFormValue[K]) => void;
