import { NextRequest } from "next/server";
import { requireVendorContext } from "@/lib/auth/vendor-context";
import { vendorProductCreateSchema } from "@/lib/api/v1/contracts";
import { resolveVendorAssetRef } from "@/lib/api/v1/vendor-assets";
import { ProductService } from "@/services/product";
import { VendorMobileCatalogService } from "@/services/vendor-mobile-catalog";
import { parsePage, v1Data, v1Exception, v1Paginated } from "@/lib/api/v1/response";
export async function GET(request: NextRequest) { try { const context = await requireVendorContext("vendor:manage_products"); const { page, pageSize } = parsePage(request.nextUrl.searchParams); const search = request.nextUrl.searchParams.get("q") ?? undefined; const categoryId = request.nextUrl.searchParams.get("categoryId") ?? undefined; const result = await VendorMobileCatalogService.list(context.vendorId, { search, categoryId, page, pageSize }); return v1Paginated(result.data, { page, pageSize, total: result.total }); } catch (error) { return v1Exception(error); } }
export async function POST(request: NextRequest) { try { const context = await requireVendorContext("vendor:manage_products"); const body = vendorProductCreateSchema.parse(await request.json()); const product = await ProductService.createProduct({ ...body, status: body.status === "ACTIVE" || body.status === "ARCHIVED" || body.status === "OUT_OF_STOCK" ? "DRAFT" : body.status, images: body.images?.map((image) => ({ ...image, url: resolveVendorAssetRef(image.assetRef, context.vendorId, "PRODUCT_IMAGE") })), vendorId: context.vendorId }); return v1Data(VendorMobileCatalogService.mutationDto(product as unknown as Record<string, unknown>), 201); } catch (error) { return v1Exception(error); } }
