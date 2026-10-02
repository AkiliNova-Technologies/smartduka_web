import type { PromotionCtaType } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { MarketingEntityCombobox } from "@/components/marketing/admin/marketing-entity-combobox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Change, PickerData, PromotionFormValue } from "./types";
import { ctaTypes } from "./types";
const labels: Record<PromotionCtaType, string> = {
  PRODUCT: "Product",
  SHOP: "Shop",
  CATEGORY: "Category",
  INTERNAL_PATH: "SmartDuka page",
  EXTERNAL_URL: "External website",
};
const entityCopy = {
  PRODUCT: {
    label: "Product",
    placeholder: "Search products...",
    empty: "No products found.",
  },
  SHOP: {
    label: "Shop",
    placeholder: "Search shops...",
    empty: "No shops found.",
  },
  CATEGORY: {
    label: "Category",
    placeholder: "Search categories...",
    empty: "No categories found.",
  },
} as const;
export function PromotionActionFields({
  form,
  change,
  pickers,
}: {
  form: PromotionFormValue;
  change: Change;
  pickers: PickerData;
}) {
  const group = (prefix: "primary" | "secondary") => {
    const type =
      prefix === "primary" ? form.primaryCtaType : form.secondaryCtaType;
    const value =
      prefix === "primary" ? form.primaryCtaValue : form.secondaryCtaValue;
    const setType = (next: PromotionCtaType | null) => {
      if (prefix === "primary")
        change("primaryCtaType", next as PromotionFormValue["primaryCtaType"]);
      else change("secondaryCtaType", next);
      if (prefix === "primary") change("primaryCtaValue", "");
      else change("secondaryCtaValue", "");
    };
    const setValue = (next: string) => {
      if (prefix === "primary") change("primaryCtaValue", next);
      else change("secondaryCtaValue", next);
    };
    const setLabel = (next: string) => {
      if (prefix === "primary") change("primaryCtaLabel", next);
      else change("secondaryCtaLabel", next);
    };
    const actionLabel =
      prefix === "primary" ? form.primaryCtaLabel : form.secondaryCtaLabel;
    const entity =
      type === "PRODUCT" || type === "SHOP" || type === "CATEGORY"
        ? entityCopy[type]
        : null;
    const source =
      type === "PRODUCT"
        ? pickers?.products
        : type === "SHOP"
          ? pickers?.shops
          : type === "CATEGORY"
            ? pickers?.categories
            : [];
    return (
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label>Button label</Label>
          <Input
            value={actionLabel ?? ""}
            onChange={(event) => setLabel(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Destination type</Label>
          <Select
            value={type ?? ""}
            onValueChange={(next) =>
              setType((next || null) as PromotionCtaType | null)
            }>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose destination type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No CTA</SelectItem>
              {ctaTypes.map((item) => (
                <SelectItem key={item} value={item}>
                  {labels[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {type && (
          entity ? (
          <MarketingEntityCombobox
            label={entity.label}
            value={value ?? ""}
            onValueChange={setValue}
            options={(source ?? []).map((item) => ({
              id: item.id,
              label: "name" in item ? item.name : item.storeName,
            }))}
            placeholder={entity.placeholder}
            emptyText={entity.empty}
            unavailable={!pickers}
            unavailableText={entity.label + "s unavailable"}
          />
          ) : (
          <div className="space-y-2">
            <Label>
              {type === "EXTERNAL_URL" ? "Website URL" : "SmartDuka path"}
            </Label>
            <Input
              type={type === "EXTERNAL_URL" ? "url" : "text"}
              value={value ?? ""}
              onChange={(event) => setValue(event.target.value)}
            />
          </div>
          )
        )}
      </div>
    );
  };
  return (
    <>
      {group("primary")}
      {group("secondary")}
    </>
  );
}
