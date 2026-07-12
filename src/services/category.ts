import { prisma } from "@/lib/prisma/client";

export interface CreateCategoryInput {
  name: string;
  slug: string;
  description: string;
  image: string;
  subCategories: { name: string; slug: string; image: string }[];
}

export interface UpdateCategoryInput {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  parentId?: string | null;
}

export class CategoryService {
  static async getAllCategories() {
    const categories = await prisma.productCategory.findMany({
      include: {
        _count: {
          select: {
            products: true,
            children: true, 
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Map Prisma fields to your Category interface
    return categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      image: cat.image || "",
      parentId: cat.parentId,  
      _count: {
        products: cat._count?.products || 0,
        subCategories: cat._count?.children || 0, 
      }
    }));
  }

  static async createCategoryWithSubs(input: CreateCategoryInput) {
    return await prisma.$transaction(async (tx) => {
      const parentCategory = await tx.productCategory.create({
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          image: input.image,
        },
      });

      if (input.subCategories.length > 0) {
        await tx.productCategory.createMany({
          data: input.subCategories.map((sub) => ({
            name: sub.name,
            slug: sub.slug,
            description: `Nested classification sub-item belonging to ${parentCategory.name}`,
            image: sub.image,
            parentId: parentCategory.id,  
          })),
        });
      }

      return parentCategory;
    });
  }

  static async getCategoryById(id: string) {
    const category = await prisma.productCategory.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        _count: {
          select: { products: true }
        }
      }
    });

    if (!category) return null;

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      image: category.image || "",
      parentId: category.parentId,  
      _count: {
        products: category._count?.products || 0,
        subCategories: category.children?.length || 0,
      }
    };
  }

  static async updateCategory(input: UpdateCategoryInput) {
    const updated = await prisma.productCategory.update({
      where: { id: input.id },
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        image: input.image,
        parentId: input.parentId !== undefined ? input.parentId : undefined,
      },
    });

    return updated;
  }

  static async deleteCategory(id: string) {
    return await prisma.productCategory.delete({
      where: { id },
    });
  }
}