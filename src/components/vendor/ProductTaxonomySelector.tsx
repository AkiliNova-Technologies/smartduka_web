"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  activeTaxonomyRoots,
  resolveTaxonomySelection,
} from "@/lib/product-taxonomy";
import type { CategoryTree } from "@/types/marketplace";

type TaxonomyComboboxProps = {
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  options: CategoryTree[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  fieldName?: string;
};

function TaxonomyCombobox({ label, placeholder, searchPlaceholder, emptyText, options, value, onChange, error, fieldName }: TaxonomyComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const selected = options.find((option) => option.id === value);
  const filtered = options.filter((option) =>
    option.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label} *</Label>
      <Popover open={open} onOpenChange={(next) => { setOpen(next); if (next) setQuery(""); }}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" role="combobox" aria-expanded={open} aria-invalid={Boolean(error)} data-product-field={fieldName} className="min-h-10 w-full justify-between rounded-full border-border/60 bg-background px-3 font-semibold">
            <span className={cn("truncate", !selected && "text-muted-foreground")}>{selected?.name ?? placeholder}</span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] rounded-xl border-border/60 p-2" onOpenAutoFocus={(event) => event.preventDefault()}>
          <Command>
            <CommandInput autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} aria-label={searchPlaceholder} />
            <CommandList className="mt-2">
              {filtered.length ? <CommandGroup>{filtered.map((option) => (
                <CommandItem key={option.id} role="option" aria-selected={option.id === value} onClick={() => { onChange(option.id); setOpen(false); }} className="rounded-lg text-xs font-medium">
                  <span className="flex-1 truncate">{option.name}</span>
                  {option.id === value && <Check className="size-4 shrink-0" />}
                </CommandItem>
              ))}</CommandGroup> : <CommandEmpty>{emptyText}</CommandEmpty>}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function ProductTaxonomySelector({ categories, categoryId, terminalId, onChange, error, leadingField }: {
  categories: CategoryTree[];
  categoryId: string;
  terminalId: string;
  onChange: (selection: { categoryId: string; subCategoryId: string }) => void;
  error?: string;
  leadingField?: React.ReactNode;
}) {
  const roots = activeTaxonomyRoots(categories);
  const resolved = resolveTaxonomySelection(roots, { categoryId, subCategoryId: terminalId });
  const subcategoryId = resolved.subcategory?.id ?? "";
  const productTypeId = resolved.productType?.id ?? "";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {leadingField}
      <TaxonomyCombobox label="Category" placeholder="Select category" searchPlaceholder="Search categories..." emptyText="No categories found." options={roots} value={categoryId} fieldName="categoryId" error={error} onChange={(next) => onChange({ categoryId: next, subCategoryId: "" })} />
      {resolved.subcategories.length > 0 && (
        <TaxonomyCombobox label="Subcategory" placeholder="Select subcategory" searchPlaceholder="Search subcategories..." emptyText="No subcategories found." options={resolved.subcategories} value={subcategoryId} onChange={(next) => {
          onChange({ categoryId, subCategoryId: next });
        }} />
      )}
      {resolved.productTypes.length > 0 && (
        <TaxonomyCombobox label="Product Type" placeholder="Select product type" searchPlaceholder="Search product types..." emptyText="No product types found." options={resolved.productTypes} value={productTypeId} onChange={(next) => onChange({ categoryId, subCategoryId: next })} />
      )}
    </div>
  );
}
