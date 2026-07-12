import { NextResponse } from "next/server";
import { CategoryService } from "@/services/category";
import { CategoryTree } from "@/types/marketplace";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode");

    const allCategories = await CategoryService.getAllCategories();

    if (mode === "tree") {
      const parentGroups = allCategories.filter(cat => !cat.parentId);
      const categoryTree: CategoryTree[] = parentGroups.map(parent => ({
        id: parent.id,
        name: parent.name,
        slug: parent.slug,
        description: parent.description || "",
        image: parent.image || "",
        parentId: parent.parentId,
        productCount: parent._count?.products || 0,
        _count: {
          products: parent._count?.products || 0,
          subCategories: parent._count?.subCategories || 0,
        },
        subCategories: allCategories
          .filter(child => child.parentId === parent.id)
          .map(child => ({
            id: child.id,
            name: child.name,
            slug: child.slug,
            description: child.description || "",
            image: child.image || "",
            parentId: child.parentId,
            productCount: child._count?.products || 0,
            _count: {
              products: child._count?.products || 0,
              subCategories: 0,
            },
            subCategories: [],
          }))
      }));

      return NextResponse.json({ success: true, data: categoryTree });
    }

    return NextResponse.json({ success: true, data: allCategories });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to retrieve catalog metadata.";
    console.error("Categories API Error:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}