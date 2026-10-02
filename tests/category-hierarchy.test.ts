import { describe, expect, it } from "vitest";
import { createCategorySchema } from "@/lib/category-validation";
import { buildCategoryTree } from "@/services/category";

const row = (id: string, parentId: string | null, sortOrder = 0) => ({
  id, parentId, sortOrder, name: id, slug: id, description: "", image: "", isActive: true,
  _count: { products: 0, subCategories: 0 },
});

describe("category hierarchy contracts", () => {
  it("normalizes category names and collision-safe slug input", () => {
    const parsed = createCategorySchema.parse({ name: "  Fashion   Apparel ", slug: "Fashion & Apparel", description: "", image: "" });
    expect(parsed.name).toBe("Fashion Apparel");
    expect(parsed.slug).toBe("fashion-apparel");
  });
  it("builds an ordered recursive tree while retaining subCategories compatibility", () => {
    const roots = buildCategoryTree([row("root", null), row("later", "root", 2), row("first", "root", 1), row("leaf", "first")]);
    expect(roots[0].children.map((node) => node.id)).toEqual(["first", "later"]);
    expect(roots[0].subCategories[0].children[0].id).toBe("leaf");
  });
});
