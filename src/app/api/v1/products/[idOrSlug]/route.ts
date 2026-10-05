import { ProductService, serializePublicProductDetail } from "@/services/product";
import { v1Data, v1Error, v1Exception } from "@/lib/api/v1/response";

export async function GET(_: Request, { params }: { params: Promise<{ idOrSlug: string }> }) {
  try {
    const { idOrSlug } = await params;
    const product = await ProductService.getPublicProductById(idOrSlug) ?? await ProductService.getPublicProductBySlug(idOrSlug);
    return product ? v1Data(serializePublicProductDetail(product as unknown as Record<string, unknown>), 200, { "Cache-Control": "public, max-age=60" }) : v1Error("NOT_FOUND", "Product not found.", 404);
  } catch (error) { return v1Exception(error); }
}
