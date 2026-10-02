"use client";

import * as React from "react";
import { Dialog } from "radix-ui";
import { CheckCircle2, Plus, Trash2, X } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type EditableProductVariant = {
  id?: string;
  sku?: string;
  name: string;
  price: number;
  inventoryCount: number;
  options: Record<string, string>;
  isActive: boolean;
};
export type OptionGroup = { id: string; name: string; values: string[] };
export type GenerationPlan = {
  generated: EditableProductVariant[];
  retained: EditableProductVariant[];
  created: EditableProductVariant[];
  retired: EditableProductVariant[];
};
const MAX_COMBINATIONS = 100;
const keyFor = (options: Record<string, string>) =>
  Object.entries(options)
    .map(
      ([key, value]) =>
        [key.trim().toLowerCase(), value.trim().toLowerCase()] as const,
    )
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("|");
const combinationOptions = (groups: OptionGroup[]) =>
  groups.reduce<Record<string, string>[]>(
    (combinations, group) =>
      combinations.flatMap((combination) =>
        group.values.map((value) => ({
          ...combination,
          [group.name.trim()]: value.trim(),
        })),
      ),
    [{}],
  );
function groupsFromVariants(variants: EditableProductVariant[]): OptionGroup[] {
  const values = new Map<string, string[]>();
  for (const variant of variants)
    for (const [group, value] of Object.entries(variant.options)) {
      const existing = values.get(group) ?? [];
      if (!existing.includes(value)) existing.push(value);
      values.set(group, existing);
    }
  return [...values.entries()].map(([name, groupValues]) => ({
    id: `${name}-${groupValues.join("-")}`,
    name,
    values: groupValues,
  }));
}

export function validateOptionGroups(groups: OptionGroup[]) {
  const errors = new Map<string, string[]>(),
    names = new Set<string>();
  for (const group of groups) {
    const groupErrors: string[] = [],
      name = group.name.trim(),
      nameKey = name.toLowerCase();
    if (!name) groupErrors.push("Enter an option name.");
    else if (names.has(nameKey))
      groupErrors.push("Option names must be unique.");
    else names.add(nameKey);
    if (!group.values.length) groupErrors.push("Add at least one value.");
    const values = new Set<string>();
    if (
      group.values.some((value) => {
        const key = value.trim().toLowerCase();
        if (!key || values.has(key)) return true;
        values.add(key);
        return false;
      })
    )
      groupErrors.push("Values must be non-empty and unique.");
    if (groupErrors.length) errors.set(group.id, groupErrors);
  }
  return errors;
}
export function buildGenerationPlan(
  groups: OptionGroup[],
  variants: EditableProductVariant[],
  defaults: { price: number; stock: number },
): GenerationPlan {
  const existing = new Map(
      variants.map((variant) => [keyFor(variant.options), variant]),
    ),
    retained: EditableProductVariant[] = [],
    created: EditableProductVariant[] = [];
  const generated = combinationOptions(groups).map((options) => {
    const current = existing.get(keyFor(options));
    if (current) {
      retained.push(current);
      return current;
    }
    const variant = {
      name: Object.values(options).join(" / "),
      price: defaults.price,
      inventoryCount: defaults.stock,
      options,
      isActive: true,
    };
    created.push(variant);
    return variant;
  });
  const generatedKeys = new Set(
      generated.map((variant) => keyFor(variant.options)),
    ),
    retired = variants
      .filter((variant) => !generatedKeys.has(keyFor(variant.options)))
      .map((variant) => ({ ...variant, isActive: false }));
  return { generated, retained, created, retired };
}
type BulkAction = "price" | "stock" | null;

export function ProductVariantEditor({
  variants,
  onChange,
  defaultPrice,
  defaultStock,
  initiallyEnabled = false,
  showProductTypeToggle = true,
}: {
  variants: EditableProductVariant[];
  onChange: (variants: EditableProductVariant[]) => void;
  defaultPrice: number;
  defaultStock: number;
  initiallyEnabled?: boolean;
  showProductTypeToggle?: boolean;
}) {
  const [enabled, setEnabled] = React.useState(initiallyEnabled || variants.length > 0),
    [groups, setGroups] = React.useState<OptionGroup[]>(() =>
      groupsFromVariants(variants),
    ),
    [selected, setSelected] = React.useState<Set<string>>(new Set()),
    [startingPrice, setStartingPrice] = React.useState(String(defaultPrice)),
    [startingStock, setStartingStock] = React.useState(String(defaultStock)),
    [optionValueInputs, setOptionValueInputs] = React.useState<
      Record<string, string>
    >({}),
    [bulkAction, setBulkAction] = React.useState<BulkAction>(null),
    [bulkValue, setBulkValue] = React.useState(""),
    [message, setMessage] = React.useState(""),
    [bulkError, setBulkError] = React.useState(""),
    [previewOpen, setPreviewOpen] = React.useState(false),
    [dirty, setDirty] = React.useState(false);
  const optionErrors = validateOptionGroups(groups),
    validOptions = groups.length > 0 && optionErrors.size === 0,
    combinationCount = validOptions ? combinationOptions(groups).length : 0;
  const plan = validOptions
    ? buildGenerationPlan(groups, variants, {
        price: Number(startingPrice),
        stock: Number(startingStock),
      })
    : null;
  const mutate = React.useCallback(
    (next: EditableProductVariant[]) => {
      setDirty(true);
      onChange(next);
    },
    [onChange],
  );
  const updateVariant = React.useCallback(
    (id: string, changes: Partial<EditableProductVariant>) =>
      mutate(
        variants.map((variant) =>
          (variant.id ?? keyFor(variant.options)) === id
            ? { ...variant, ...changes }
            : variant,
        ),
      ),
    [mutate, variants],
  );
  const selectedVariants = variants.filter((variant) =>
    selected.has(variant.id ?? keyFor(variant.options)),
  );
  const variantErrors = React.useMemo(() => {
    const errorsByVariant = new Map<string, string[]>();
    for (const variant of variants) {
      const id = variant.id ?? keyFor(variant.options), errors: string[] = [];
      if (!Number.isFinite(variant.price) || variant.price < 0) errors.push("Price must be zero or more.");
      if (!Number.isInteger(variant.inventoryCount) || variant.inventoryCount < 0) errors.push("Stock must be a whole number of zero or more.");
      if (errors.length) errorsByVariant.set(id, errors);
    }
    return errorsByVariant;
  }, [variants]);
  const addOptionValue = (index: number) => {
    const group = groups[index],
      value = optionValueInputs[group.id]?.trim();
    if (!value) return;
    if (
      group.values.some((item) => item.toLowerCase() === value.toLowerCase())
    ) {
      setMessage(
        `“${value}” is already listed for ${group.name || "this option"}.`,
      );
      return;
    }
    setGroups(
      groups.map((item, current) =>
        current === index ? { ...item, values: [...item.values, value] } : item,
      ),
    );
    setOptionValueInputs((inputs) => ({ ...inputs, [group.id]: "" }));
    setMessage("");
  };
  const confirmGeneration = () => {
    if (!plan) return;
    mutate([...plan.generated, ...plan.retired]);
    setPreviewOpen(false);
    setMessage(
      `${plan.created.length ? `${plan.created.length} new ` : ""} product variant${plan.generated.length === 1 ? "" : "s"} ready to manage.`,
    );
  };
  const requestGeneration = () => {
    if (!plan || combinationCount > MAX_COMBINATIONS) return;
    if (plan.retired.length) setPreviewOpen(true);
    else confirmGeneration();
  };
  const applyBulk = () => {
    if (!bulkAction || !selectedVariants.length) return;
    const value = bulkValue.trim();
    if (!value)
      return setBulkError("Enter a value before applying this change.");
    {
      const number = Number(value);
      if (
        !Number.isFinite(number) ||
        number < 0 ||
        (bulkAction === "stock" && !Number.isInteger(number))
      )
        return setBulkError(
          bulkAction === "stock"
            ? "Enter a whole stock quantity of zero or more."
            : "Enter a valid price of zero or more.",
        );
      mutate(
        variants.map((variant) =>
          selected.has(variant.id ?? keyFor(variant.options))
            ? {
                ...variant,
                [bulkAction === "price" ? "price" : "inventoryCount"]: number,
              }
            : variant,
        ),
      );
    }
    setMessage(
      `${bulkAction === "price" ? "Prices" : "Stock"} updated for ${selectedVariants.length} selected variant${selectedVariants.length === 1 ? "" : "s"}.`,
    );
    setBulkAction(null);
    setBulkValue("");
    setBulkError("");
  };
  const columns = React.useMemo<ColumnDef<EditableProductVariant>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <Checkbox
            aria-label="Select all variants"
            checked={variants.length > 0 && selected.size === variants.length}
            onCheckedChange={(checked) =>
              setSelected(
                checked
                  ? new Set(
                      variants.map(
                        (variant) => variant.id ?? keyFor(variant.options),
                      ),
                    )
                  : new Set(),
              )
            }
          />
        ),
        cell: ({ row }) => {
          const id = row.original.id ?? keyFor(row.original.options);
          return (
            <Checkbox
              aria-label={`Select ${row.original.name}`}
              checked={selected.has(id)}
              onCheckedChange={(checked) =>
                setSelected((current) => {
                  const next = new Set(current);
                  if (checked) next.add(id);
                  else next.delete(id);
                  return next;
                })
              }
            />
          );
        },
      },
      {
        accessorKey: "name",
        header: "Variant",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs font-medium">
            {row.original.name}
          </span>
        ),
      },
      {
        accessorKey: "price",
        header: "Selling price",
        cell: ({ row }) => {
          const id = row.original.id ?? keyFor(row.original.options),
            error = variantErrors
              .get(id)
              ?.find((item) => item.includes("Price"));
          return (
            <div className="min-w-18">
              <Input
                min="0"
                value={row.original.price}
                aria-label={`Selling price for ${row.original.name}`}
                aria-invalid={Boolean(error)}
                className="h-9 rounded-full text-xs w-[140px]"
                onChange={(event) =>
                  updateVariant(id, { price: Number(event.target.value) })
                }
              />
              {error && (
                <p className="mt-1 text-[11px] text-destructive">{error}</p>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "inventoryCount",
        header: "Stock",
        cell: ({ row }) => {
          const id = row.original.id ?? keyFor(row.original.options),
            error = variantErrors
              .get(id)
              ?.find((item) => item.includes("Stock"));
          return (
            <div className="min-w-24">
              <Input
                min="0"
                step="1"
                value={row.original.inventoryCount}
                aria-label={`Stock for ${row.original.name}`}
                aria-invalid={Boolean(error)}
                className="h-9 rounded-full text-xs w-[80px]"
                onChange={(event) =>
                  updateVariant(id, {
                    inventoryCount: Number(event.target.value),
                  })
                }
              />
              {error && (
                <p className="mt-1 text-[11px] text-destructive">{error}</p>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "isActive",
        header: "Availability",
        cell: ({ row }) => {
          const id = row.original.id ?? keyFor(row.original.options);
          return (
            <label className="flex items-center gap-2 whitespace-nowrap text-xs">
              <Checkbox
                aria-label={`Make ${row.original.name} available`}
                checked={row.original.isActive}
                onCheckedChange={(checked) =>
                  updateVariant(id, { isActive: checked === true })
                }
              />
              {row.original.isActive ? "Available" : "Retired"}
            </label>
          );
        },
      },
    ],
    [selected, updateVariant, variantErrors, variants],
  );
  return (
    <section
      aria-label="Product variants"
      className="min-w-0 max-w-full space-y-6">
      {showProductTypeToggle && <div className="space-y-2 border-b border-border/40 pb-5">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Product options
        </Label>
        <label className="flex cursor-pointer items-start gap-3 text-sm font-medium">
          <Checkbox
            checked={enabled}
            className="mt-1"
            onCheckedChange={(checked) => {
              if (!checked && variants.length) {
                setMessage(
                  "Existing variants are kept for order history. Retire individual variants instead.",
                );
                return;
              }
              setEnabled(checked === true);
              if (checked && !groups.length)
                setGroups([
                  { id: "size", name: "Size", values: [] },
                  { id: "colour", name: "Colour", values: [] },
                ]);
            }}
          />
          <span>
            This product comes in different sizes, colours or other options.
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              When off, the price and stock from Basic Info are used.
            </span>
          </span>
        </label>
      </div>}
      {!enabled ? (
        <p className="rounded-xl bg-muted/30 px-4 text-xs text-muted-foreground">
          Add options only when customers need to choose between combinations
          such as a size or colour.
        </p>
      ) : (
        <>
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Configure options
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                For example, add Size with Small, Medium and Large, then Colour
                with Black and Red.
              </p>
            </div>
              <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 rounded-full"
              onClick={() =>
                setGroups([
                  ...groups,
                  { id: crypto.randomUUID(), name: "", values: [] },
                ])
              }>
              <Plus className="size-3" /> Add option
            </Button>
            </div>
            <div className="grid grid-cols-1 gap-4">

            {groups.map((group, index) => (
              <div
                key={group.id}
                className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Label
                      htmlFor={`option-${group.id}`}
                      className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Option name
                    </Label>
                    <Input
                      id={`option-${group.id}`}
                      value={group.name}
                      className="h-10 rounded-full border-border/60 bg-background text-xs"
                      placeholder="e.g. Size"
                      aria-invalid={Boolean(
                        optionErrors
                          .get(group.id)
                          ?.some((error) => error.includes("Option name")),
                      )}
                      onChange={(event) =>
                        setGroups(
                          groups.map((item, current) =>
                            current === index
                              ? { ...item, name: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${group.name || "option group"}`}
                    onClick={() =>
                      setGroups(
                        groups.filter((_, current) => current !== index),
                      )
                    }>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Values
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {group.values.map((value, valueIndex) => (
                      <span
                        key={`${group.id}-${valueIndex}`}
                        className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/50 py-1 pl-3 pr-1 text-[12px] font-medium">
                        {value}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Remove ${value}`}
                          className="p-0 hover:text-rose-500"
                          onClick={() =>
                            setGroups(
                              groups.map((item, current) =>
                                current === index
                                  ? {
                                      ...item,
                                      values: item.values.filter(
                                        (_, inner) => inner !== valueIndex,
                                      ),
                                    }
                                  : item,
                              ),
                            )
                          }>
                          <X className="size-3" />
                        </Button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={optionValueInputs[group.id] ?? ""}
                      aria-label={`Add a value to ${group.name || "option"}`}
                      onChange={(event) =>
                        setOptionValueInputs((inputs) => ({
                          ...inputs,
                          [group.id]: event.target.value,
                        }))
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addOptionValue(index);
                        }
                      }}
                      placeholder="Add a value"
                      className="h-10 rounded-full border-border/60 bg-background text-xs"
                    />
                    <Button
                      type="button"
                      size="icon"
                      className="h-10 w-10 rounded-full p-0 dark:text-white"
                      aria-label={`Add a value to ${group.name || "option"}`}
                      onClick={() => addOptionValue(index)}>
                      <Plus className="size-5" />
                    </Button>
                  </div>
                  {optionErrors.get(group.id)?.map((error) => (
                    <p
                      key={error}
                      role="alert"
                      className="text-xs text-destructive">
                      {error}
                    </p>
                  ))}
                </div>
              </div>
            ))}

            </div>
            
            <p
              className={
                combinationCount
                  ? "text-sm font-medium"
                  : "text-sm text-muted-foreground"
              }>
              {combinationCount > MAX_COMBINATIONS
                ? `Choose fewer values — the limit is ${MAX_COMBINATIONS} variants.`
                : combinationCount
                  ? `${combinationCount} product variant${combinationCount === 1 ? " will" : "s will"} be created.`
                  : "Add an option name and at least one value to create variants."}
            </p>
          </div>
          <div className="space-y-4 border-t border-border/40 pt-5">
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Starting values for new variants
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                These values apply only to new combinations. Existing matching
                variants keep their values.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Selling price"
                id="variant-starting-price"
                value={startingPrice}
                setValue={setStartingPrice}
              />
              <Field
                label="Stock per variant"
                id="variant-starting-stock"
                value={startingStock}
                setValue={setStartingStock}
              />
            </div>
            <Button
              type="button"
              className="mt-2 rounded-full dark:text-white px-4"
              disabled={
                !validOptions ||
                combinationCount > MAX_COMBINATIONS ||
                !Number.isFinite(Number(startingPrice)) ||
                Number(startingPrice) < 0 ||
                !Number.isInteger(Number(startingStock)) ||
                Number(startingStock) < 0
              }
              onClick={requestGeneration}>
              {variants.length
                ? `Review ${combinationCount} variants`
                : `Create ${combinationCount} variant${combinationCount === 1 ? "" : "s"}`}
            </Button>
          </div>
          {message && (
            <p
              role="status"
              className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-800">
              <CheckCircle2 className="mr-1 inline size-3.5" />
              {message}
            </p>
          )}
          {variants.length > 0 && (
            <div className="space-y-3 border-t border-border/40 pt-5">
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Manage variants
                </Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Edit price, stock and availability. SKUs are assigned automatically when new variants are saved. Changes are saved
                  when you publish or update this product.
                </p>
              </div>
              {variantErrors.size > 0 && (
                <p
                  role="alert"
                  className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                  Fix the highlighted variant fields before saving.
                </p>
              )}
              {selectedVariants.length > 0 && (
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-medium">
                      {selectedVariants.length} variant
                      {selectedVariants.length === 1 ? "" : "s"} selected
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelected(new Set());
                        setBulkAction(null);
                        setBulkError("");
                      }}>
                      Clear selection
                    </Button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <BulkButton
                      active={bulkAction === "price"}
                      onClick={() => {
                        setBulkAction("price");
                        setBulkValue("");
                        setBulkError("");
                      }}>
                      Update prices
                    </BulkButton>
                    <BulkButton
                      active={bulkAction === "stock"}
                      onClick={() => {
                        setBulkAction("stock");
                        setBulkValue("");
                        setBulkError("");
                      }}>
                      Update stock
                    </BulkButton>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        mutate(
                          variants.map((variant) =>
                            selected.has(variant.id ?? keyFor(variant.options))
                              ? { ...variant, isActive: true }
                              : variant,
                          ),
                        )
                      }>
                      Enable selected
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        mutate(
                          variants.map((variant) =>
                            selected.has(variant.id ?? keyFor(variant.options))
                              ? { ...variant, isActive: false }
                              : variant,
                          ),
                        )
                      }>
                      Disable selected
                    </Button>
                  </div>
                  {bulkAction && (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <Input
                        value={bulkValue}
                        type="number"
                        min="0"
                        step={bulkAction === "stock" ? "1" : undefined}
                        placeholder={
                          bulkAction === "price"
                              ? "New selling price"
                              : "New stock quantity"
                        }
                        aria-invalid={Boolean(bulkError)}
                        className="h-10 rounded-full bg-background text-xs"
                        onChange={(event) => {
                          setBulkValue(event.target.value);
                          setBulkError("");
                        }}
                      />
                      <Button type="button" onClick={applyBulk}>
                        Apply to {selectedVariants.length}
                      </Button>
                      {bulkError && (
                        <p
                          role="alert"
                          className="self-center text-xs text-destructive">
                          {bulkError}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
              <DataTable
                columns={columns}
                data={variants}
                getRowId={(variant) => variant.id ?? keyFor(variant.options)}
                emptyStateContent="Your product variants will appear here once you add options and create combinations."
                features={{
                  pagination: false,
                  search: false,
                  columnVisibility: false,
                  sorting: false,
                  filtering: false,
                  rowSelection: true,
                  footer: false,
                }}
              />
            </div>
          )}
          {dirty && (
            <p role="status" className="text-xs text-amber-700">
              Variant changes will be saved when you publish or update this
              product.
            </p>
          )}
        </>
      )}
      <Dialog.Root open={previewOpen} onOpenChange={setPreviewOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border/60 bg-card p-6 shadow-lg">
            <Dialog.Title className="text-base font-semibold">
              Review variant changes
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-muted-foreground">
              Your option edits change the combinations you sell.
            </Dialog.Description>
            {plan && (
              <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
                <Count value={plan.retained.length} label="kept" />
                <Count value={plan.created.length} label="new" />
                <Count value={plan.retired.length} label="retired" />
              </div>
            )}
            <p className="mt-4 text-xs text-muted-foreground">
              Retired variants are unavailable to customers. Variants used in
              orders are retained for order history when the product is saved.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPreviewOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={confirmGeneration}>
                Confirm changes
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
function Field({
  label,
  id,
  value,
  setValue,
  type = "text",
  placeholder,
}: {
  label: string;
  id: string;
  value: string;
  setValue: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label
        htmlFor={id}
        className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        min={type === "number" ? "0" : undefined}
        step={label.includes("Stock") ? "1" : undefined}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-full border-border/60 bg-background text-xs"
      />
    </div>
  );
}
function BulkButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={onClick}>
      {children}
    </Button>
  );
}
function Count({ value, label }: { value: number; label: string }) {
  return (
    <div
      className={
        label === "retired"
          ? "rounded-xl bg-amber-500/10 p-3"
          : "rounded-xl bg-muted/50 p-3"
      }>
      <strong className="block text-base">{value}</strong>
      {label}
    </div>
  );
}
