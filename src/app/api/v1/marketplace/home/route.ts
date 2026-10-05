import { CategoryService } from "@/services/category";
import { ProductService } from "@/services/product";
import { VendorService } from "@/services/vendor";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
export async function GET() { try { const [categories, featuredProducts, shops] = await Promise.all([CategoryService.getHomepageCategories(), ProductService.getNewArrivals(12), VendorService.getPublicStoreListings()]); return v1Data({ categories, featuredProducts, featuredShops: shops.slice(0, 8) }, 200, { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" }); } catch (error) { return v1Exception(error); } }
