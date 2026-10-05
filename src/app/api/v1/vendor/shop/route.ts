import { requireVendorContext } from "@/lib/auth/vendor-context";
import { vendorShopPatchSchema } from "@/lib/api/v1/contracts";
import { resolveVendorAssetRef } from "@/lib/api/v1/vendor-assets";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
import { VendorMobileShopService } from "@/services/vendor-mobile-shop";
export async function GET(){try{const c=await requireVendorContext("vendor:manage_shop");return v1Data(await VendorMobileShopService.get(c.vendorId),200,{"Cache-Control":"private, no-store"})}catch(e){return v1Exception(e)}}
export async function PATCH(request:Request){try{const c=await requireVendorContext("vendor:manage_shop"),body=vendorShopPatchSchema.parse(await request.json());return v1Data(await VendorMobileShopService.update(c.vendorId,{...body,logoUrl:body.logoUrl===undefined?undefined:body.logoUrl===null?null:resolveVendorAssetRef(body.logoUrl,c.vendorId,"SHOP_LOGO"),bannerUrl:body.bannerUrl===undefined?undefined:body.bannerUrl===null?null:resolveVendorAssetRef(body.bannerUrl,c.vendorId,"SHOP_BANNER")}))}catch(e){return v1Exception(e)}}
