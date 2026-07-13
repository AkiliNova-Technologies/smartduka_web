import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import { StoreProfileContent } from "./StoreProfileContent";

interface PageProps {
  params: Promise<{ vendorSlug: string }>;
}

export default async function StoreProfilePage({ params }: PageProps) {
  const { vendorSlug } = await params;

  const vendorProfile = await prisma.vendorProfile.findUnique({
    where: { slug: vendorSlug, status: "ACTIVE", deletedAt: null },
    include: {
      products: {
        where: { status: { in: ["ACTIVE", "PUBLISHED"] }, deletedAt: null },
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          category: true,
          subCategory: true,
          _count: { select: { reviews: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      documents: true,
      _count: { select: { products: true } },
    },
  });

  if (!vendorProfile) notFound();

  // Derive verified status from documents
  const isVerified = vendorProfile.documents.length > 0;

  // Get unique categories from products for the filter bar
  const productCategories = Array.from(
    new Map(
      vendorProfile.products
        .filter((p) => p.category)
        .map((p) => [p.category!.id, { id: p.category!.id, name: p.category!.name }])
    ).values()
  );

  // Serialize products for client component
  const serializedProducts = vendorProfile.products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    brand: p.brand,
    description: p.description,
    basePrice: Number(p.basePrice),
    compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
    inventoryCount: p.inventoryCount,
    status: p.status,
    image: p.images[0]?.url || "",
    images: p.images.map((img) => ({ id: img.id, url: img.url, isFeatured: img.isFeatured })),
    categoryId: p.categoryId,
    categoryName: p.category?.name || null,
    subCategoryName: p.subCategory?.name || null,
    rating: 4.5,
    reviews: p._count.reviews,
    sizes: p.sizes,
    colors: p.colors,
    tags: p.tags,
    vendorId: p.vendorId,
  }));

  const store = {
    id: vendorProfile.id,
    name: vendorProfile.storeName,
    slug: vendorProfile.slug,
    logo: vendorProfile.logoUrl || "/placeholder-store.png",
    banner: vendorProfile.bannerUrl || null,
    verified: isVerified,
    rating: 4.5,
    description: vendorProfile.description || null,
    email: vendorProfile.email || null,
    phone: vendorProfile.phone || null,
    website: vendorProfile.website || null,
    address: vendorProfile.address || null,
    city: vendorProfile.city || "Kampala",
    country: vendorProfile.country || "Uganda",
    totalProducts: vendorProfile._count.products,
    joinedAt: vendorProfile.createdAt.toISOString(),
    documents: vendorProfile.documents.length,
  };

  return (
    <StoreProfileContent
      store={store}
      products={serializedProducts}
      categories={productCategories}
    />
  );
}