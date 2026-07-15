import { NextRequest } from "next/server";
import { CategoryService } from "@/services/category";
import { CategoryTree } from "@/types/marketplace";
import { successResponse, errorResponse, getErrorMessage } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const mode = searchParams.get("mode");

    const allCategories = await CategoryService.getAllCategories();

    if (mode === "tree") {
      const parentGroups = allCategories.filter((cat) => !cat.parentId);
      const categoryTree: CategoryTree[] = parentGroups.map((parent) => ({
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
          .filter((child) => child.parentId === parent.id)
          .map((child) => ({
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
          })),
      }));

      return successResponse(categoryTree);
    }

    return successResponse(allCategories);
  } catch (error: unknown) {
    console.error("[Categories API]", error);
    return errorResponse(getErrorMessage(error));
  }
}