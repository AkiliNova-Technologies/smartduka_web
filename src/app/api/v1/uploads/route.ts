import { requireVendorContext } from "@/lib/auth/vendor-context";
import { uploadAuthorizationSchema } from "@/lib/api/v1/contracts";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
import { VendorUploadAuthorizationService } from "@/services/vendor-upload-authorization";
export async function POST(request:Request){try{const input=uploadAuthorizationSchema.parse(await request.json());const permission=input.purpose==="PRODUCT_IMAGE"?"vendor:manage_products":"vendor:manage_shop";const c=await requireVendorContext(permission);return v1Data(await VendorUploadAuthorizationService.authorize(c.vendorId,input))}catch(e){return v1Exception(e)}}
