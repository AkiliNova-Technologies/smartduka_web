import { requireVendorContext } from "@/lib/auth/vendor-context";
import { ProductService } from "@/services/product";
import { vendorProductPatchSchema } from "@/lib/api/v1/contracts";
import { resolveVendorAssetRef } from "@/lib/api/v1/vendor-assets";
import { v1Data, v1Error, v1Exception } from "@/lib/api/v1/response";
import { VendorMobileCatalogService } from "@/services/vendor-mobile-catalog";
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){try{const c=await requireVendorContext("vendor:manage_products"),id=(await params).id;const p=await VendorMobileCatalogService.detail(c.vendorId,id);if(!p)return v1Error("NOT_FOUND","Product not found.",404);return v1Data(p,200,{"Cache-Control":"private, no-store"})}catch(e){return v1Exception(e)}}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{const c=await requireVendorContext("vendor:manage_products"),id=(await params).id;if(!await VendorMobileCatalogService.exists(c.vendorId,id))return v1Error("NOT_FOUND","Product not found.",404);const body=vendorProductPatchSchema.parse(await request.json());const product=await ProductService.updateProduct({...body,images:body.images?.map(image=>({...image,url:resolveVendorAssetRef(image.assetRef,c.vendorId,"PRODUCT_IMAGE")})),id});return v1Data(VendorMobileCatalogService.mutationDto(product as unknown as Record<string, unknown>))}catch(e){return v1Exception(e)}}
