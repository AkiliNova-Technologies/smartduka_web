import { z } from "zod";

export const variantOptionsSchema = z.record(z.string().trim().min(1).max(60), z.string().trim().min(1).max(80))
  .refine((options) => Object.keys(options).length > 0, "A variant needs at least one option value.");
export const variantSchema = z.object({
  id: z.string().uuid().optional(),
  sku: z.string().trim().min(1, "Variant SKU is required.").max(120).optional(),
  name: z.string().trim().min(1, "Variant name is required.").max(160),
  price: z.coerce.number().finite().min(0),
  inventoryCount: z.coerce.number().int().min(0),
  options: variantOptionsSchema,
  isActive: z.boolean().optional().default(true),
});
export type VariantInput = z.input<typeof variantSchema>;
export function optionKey(options: Record<string, string>) {
  return Object.entries(options).map(([key, value]) => [key.trim().toLowerCase(), value.trim().toLowerCase()] as const).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("|");
}
export function validateVariants(input: VariantInput[] | undefined) {
  const variants = z.array(variantSchema).optional().default([]).parse(input);
  const keys = new Set<string>(), skus = new Set<string>();
  for (const variant of variants) {
    const key = optionKey(variant.options);
    if (keys.has(key)) throw new Error("Duplicate variant option combination.");
    if (variant.sku && skus.has(variant.sku.toLowerCase())) throw new Error("Duplicate variant SKU.");
    keys.add(key); if (variant.sku) skus.add(variant.sku.toLowerCase());
  }
  return variants.map((variant) => ({ ...variant, optionKey: optionKey(variant.options) }));
}
