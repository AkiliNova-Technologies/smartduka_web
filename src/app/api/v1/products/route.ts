import { NextRequest } from "next/server";
import { ProductService } from "@/services/product";
import { productQuerySchema } from "@/lib/api/v1/contracts";
import { parsePage, v1Exception, v1Paginated } from "@/lib/api/v1/response";

export async function GET(request: NextRequest) {
  try {
    const query = productQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const { page, pageSize } = parsePage(request.nextUrl.searchParams);
    const products = await ProductService.getPublicCatalogProducts({
      search: query.q, categoryId: query.categoryId, minPrice: query.minPrice, maxPrice: query.maxPrice,
      inStock: query.inStock === "true", sort: query.sort === "price_asc" ? "price-asc" : query.sort === "price_desc" ? "price-desc" : undefined,
      page, limit: pageSize,
    });
    const filtered = query.shopId ? products.filter((product) => product.vendorId === query.shopId) : products;
    return v1Paginated(filtered, { page, pageSize, total: filtered.length + (products.length === pageSize ? pageSize : 0) });
  } catch (error) { return v1Exception(error); }
}
