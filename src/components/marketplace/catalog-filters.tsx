"use client";
import * as React from "react";
import { SlidersHorizontal } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type Category = { id: string; name: string; children?: Category[] };
type Values = {
  categoryId: string;
  minPrice: string;
  maxPrice: string;
  inStock: boolean;
  brand: string;
  sizes: string[];
  colors: string[];
};
const keys = [
  "category",
  "minPrice",
  "maxPrice",
  "inStock",
  "brand",
  "sizes",
  "colors",
] as const;
const read = (p: URLSearchParams): Values => ({
  categoryId: p.get("category") ?? "",
  minPrice: p.get("minPrice") ?? "",
  maxPrice: p.get("maxPrice") ?? "",
  inStock: p.get("inStock") === "1",
  brand: p.get("brand") ?? "",
  sizes: p.get("sizes")?.split(",").filter(Boolean) ?? [],
  colors: p.get("colors")?.split(",").filter(Boolean) ?? [],
});
const toggle = (values: string[], value: string) =>
  values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
const findPath = (nodes: Category[], id: string): Category[] => {
  for (const node of nodes) {
    if (node.id === id) return [node];
    const path = findPath(node.children ?? [], id);
    if (path.length) return [node, ...path];
  }
  return [];
};
export function CatalogFilters({
  categories,
  brands,
  sizes,
  colors,
}: {
  categories: Category[];
  brands: string[];
  sizes: string[];
  colors: string[];
}) {
  const router = useRouter(),
    params = useSearchParams(),
    applied = read(params);
  const [open, setOpen] = React.useState(false),
    [draft, setDraft] = React.useState(applied),
    [error, setError] = React.useState("");
  const path = findPath(categories, draft.categoryId);
  const apply = () => {
    const min = Number(draft.minPrice),
      max = Number(draft.maxPrice);
    if (
      (draft.minPrice && (!Number.isFinite(min) || min < 0)) ||
      (draft.maxPrice && (!Number.isFinite(max) || max < 0)) ||
      (draft.minPrice && draft.maxPrice && min > max)
    )
      return setError("Enter a valid price range in UGX.");
    const next = new URLSearchParams(params.toString());
    keys.forEach((key) => next.delete(key));
    if (draft.categoryId) next.set("category", draft.categoryId);
    if (draft.minPrice) next.set("minPrice", draft.minPrice);
    if (draft.maxPrice) next.set("maxPrice", draft.maxPrice);
    if (draft.inStock) next.set("inStock", "1");
    if (draft.brand) next.set("brand", draft.brand);
    if (draft.sizes.length) next.set("sizes", draft.sizes.join(","));
    if (draft.colors.length) next.set("colors", draft.colors.join(","));
    next.delete("page");
    router.push(`/products${next.size ? `?${next}` : ""}`);
    setOpen(false);
  };
  const active =
    Number(Boolean(applied.categoryId)) +
    Number(Boolean(applied.minPrice || applied.maxPrice)) +
    Number(applied.inStock) +
    Number(Boolean(applied.brand)) +
    applied.sizes.length +
    applied.colors.length;
  const clear = () =>
    setDraft({
      categoryId: "",
      minPrice: "",
      maxPrice: "",
      inStock: false,
      brand: "",
      sizes: [],
      colors: [],
    });
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-11 rounded-full px-3"
        onClick={() => {
          setDraft(applied);
          setOpen(true);
        }}>
        <SlidersHorizontal className="size-4" /> Filters
        {active ? ` (${active})` : ""}
      </Button>
      {active > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              const next = new URLSearchParams(params);
              keys.forEach((key) => next.delete(key));
              next.delete("page");
              router.push(`/products${next.size ? `?${next}` : ""}`);
            }}
            className="text-sm font-semibold text-primary hover:underline">
            Clear all
          </button>
        </div>
      )}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>
              Refine products without changing search or sort.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pb-4">
            <CategorySelect
              label="Category"
              value={path[0]?.id}
              options={categories}
              onChange={(id) =>
                setDraft({ ...draft, categoryId: id === "all" ? "" : id })
              }
            />
            {path[0]?.children?.length ? (
              <CategorySelect
                label="Subcategory"
                value={path[1]?.id}
                options={path[0].children}
                onChange={(id) =>
                  setDraft({
                    ...draft,
                    categoryId: id === "all" ? path[0].id : id,
                  })
                }
              />
            ) : null}
            {path[1]?.children?.length ? (
              <CategorySelect
                label="More specific category"
                value={path[2]?.id}
                options={path[1].children}
                onChange={(id) =>
                  setDraft({
                    ...draft,
                    categoryId: id === "all" ? path[1].id : id,
                  })
                }
              />
            ) : null}
            <label className="flex flex-col gap-2 text-sm font-medium">
              <span>Price (UGX)</span>
              <span className="grid grid-cols-2 gap-3">
                <input
                  inputMode="numeric"
                  value={draft.minPrice}
                  onChange={(e) =>
                    setDraft({ ...draft, minPrice: e.target.value })
                  }
                  placeholder="Minimum"
                  className="h-11 rounded-full border bg-background px-4"
                />
                <input
                  inputMode="numeric"
                  value={draft.maxPrice}
                  onChange={(e) =>
                    setDraft({ ...draft, maxPrice: e.target.value })
                  }
                  placeholder="Maximum"
                  className="h-11 rounded-full border bg-background px-4"
                />
              </span>
            </label>
            <label className="flex items-center gap-3 rounded-full border p-3 text-sm font-medium">
              <Checkbox
                checked={draft.inStock}
                onCheckedChange={(checked) =>
                  setDraft({ ...draft, inStock: checked === true })
                }
              />
              In-stock products only
            </label>
            {brands.length > 0 && (
              <SelectField
                label="Brand"
                value={draft.brand || "all"}
                options={brands}
                onChange={(brand) =>
                  setDraft({ ...draft, brand: brand === "all" ? "" : brand })
                }
              />
            )}{" "}
            {sizes.length > 0 && (
              <Chips
                label="Size"
                values={sizes}
                selected={draft.sizes}
                onChange={(value) =>
                  setDraft({ ...draft, sizes: toggle(draft.sizes, value) })
                }
              />
            )}{" "}
            {colors.length > 0 && (
              <Chips
                label="Colour"
                values={colors}
                selected={draft.colors}
                onChange={(value) =>
                  setDraft({ ...draft, colors: toggle(draft.colors, value) })
                }
              />
            )}{" "}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <SheetFooter className="border-t bg-background sm:flex-row justify-between">
            <Button type="button" variant="outline" className="rounded-full" onClick={clear}>
              Clear all
            </Button>
            <Button type="button" className="rounded-full px-4 dark:text-white" onClick={apply}>
              Apply filters
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
function CategorySelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: string;
  options: Category[];
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value ?? "all"} onValueChange={onChange}>
      <label className="flex flex-col gap-2 text-sm font-medium">
        <span>{label}</span>
        <SelectTrigger className="h-11 w-full rounded-xl">
          <SelectValue placeholder={`All ${label.toLowerCase()}s`} />
        </SelectTrigger>
      </label>
      <SelectContent className="p-2">
        <SelectItem value="all">All {label.toLowerCase()}s</SelectItem>
        {options.map((item) => (
          <SelectItem key={item.id} value={item.id}>
            {item.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <label className="flex flex-col gap-2 text-sm font-medium">
        <span>{label}</span>
        <SelectTrigger className="h-11 w-full rounded-xl">
          <SelectValue />
        </SelectTrigger>
      </label>
      <SelectContent>
        <SelectItem value="all">All brands</SelectItem>
        {options.map((item) => (
          <SelectItem key={item} value={item}>
            {item}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function Chips({
  label,
  values,
  selected,
  onChange,
}: {
  label: string;
  values: string[];
  selected: string[];
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={selected.includes(value)}
            onClick={() => onChange(value)}
            className={`rounded-full border px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected.includes(value) ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            {value}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
