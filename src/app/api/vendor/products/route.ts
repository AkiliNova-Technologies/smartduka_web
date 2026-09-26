import { NextRequest } from "next/server";
import { ProductService } from "@/services/product";
import { requireVendorContext, VendorAuthorizationError } from "@/lib/auth/vendor-context";
import { AuthenticationRequiredError } from "@/lib/auth/session";
import { successResponse, errorResponse, getErrorMessage } from "@/lib/api-utils";

function authorizationError(error: unknown) {
  return errorResponse(getErrorMessage(error), error instanceof AuthenticationRequiredError ? 401 : error instanceof VendorAuthorizationError ? 403 : 500);
}

export async function GET(request: NextRequest) {
  try {
    const context = await requireVendorContext("vendor:manage_products");
    const { searchParams } = request.nextUrl;
    const categoryId = searchParams.get("categoryId") || undefined;
    const search = searchParams.get("search") || undefined;
    const products = await ProductService.getVendorProducts(context.vendorId, { categoryId, search });
    return successResponse(products);
  } catch (error: unknown) {
    return authorizationError(error);
  }
}
