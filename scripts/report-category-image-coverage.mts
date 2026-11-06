import { prisma } from "@/lib/prisma/client";

const categories = await prisma.productCategory.findMany({
  where: { isActive: true },
  select: { id: true, name: true, slug: true, image: true, parentId: true },
  orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
});
const byId = new Map(categories.map((category) => [category.id, category]));
const pathFor = (id: string) => {
  const path: string[] = [];
  let current = byId.get(id);
  while (current) {
    path.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path.join(" > ");
};
const missing = categories.filter((category) => !category.image?.trim());

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  activeNodes: categories.length,
  activeNodesWithoutImages: missing.length,
  missing: missing.map((category) => ({ id: category.id, slug: category.slug, path: pathFor(category.id) })),
}, null, 2));
await prisma.$disconnect();
