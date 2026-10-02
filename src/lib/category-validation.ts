import { z } from "zod";

const text = z.string().trim().max(2_000).optional().default("");

export const categoryBaseSchema = z.object({
  name: z.string().trim().min(1).max(120).transform((value) => value.replace(/\s+/g, " ")),
  slug: z.string().trim().min(1).max(120).transform((value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")).refine(Boolean, "Slug must contain letters or numbers."),
  description: text,
  image: z.string().trim().max(2_048).optional().default(""),
  sortOrder: z.coerce.number().int().min(0).max(1_000_000).optional().default(0),
});

export const createCategorySchema = categoryBaseSchema.extend({
  parentId: z.string().uuid().nullable().optional(),
  subCategories: z.array(categoryBaseSchema.pick({ name: true, slug: true, description: true, image: true, sortOrder: true })).optional().default([]),
});
export const updateCategorySchema = categoryBaseSchema.extend({
  id: z.string().uuid(), parentId: z.string().uuid().nullable().optional(), isActive: z.boolean().optional(),
});
export const moveCategorySchema = z.object({ id: z.string().uuid(), parentId: z.string().uuid().nullable() });
export const categoryStatusSchema = z.object({ id: z.string().uuid(), isActive: z.boolean() });

export type CreateCategoryInput = z.input<typeof createCategorySchema>;
export type UpdateCategoryInput = z.input<typeof updateCategorySchema>;
