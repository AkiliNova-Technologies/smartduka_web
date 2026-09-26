import { NextRequest } from "next/server";
import { ProductService, type CreateProductInput } from "@/services/product";
import { requireVendorContext, VendorAuthorizationError } from "@/lib/auth/vendor-context";
import { AuthenticationRequiredError } from "@/lib/auth/session";
import { successResponse, errorResponse, getErrorMessage } from "@/lib/api-utils";

function authorizationError(error: unknown) {
  return errorResponse(getErrorMessage(error), error instanceof AuthenticationRequiredError ? 401 : error instanceof VendorAuthorizationError ? 403 : 500);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const vendorId = searchParams.get("vendorId") || undefined;
    const categoryId = searchParams.get("categoryId") || undefined;
    const search = searchParams.get("search") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : undefined;
    const products = await ProductService.getAllProducts({ vendorId, categoryId, search, limit, offset, status: ["ACTIVE", "PUBLISHED"] });
    return successResponse(products);
  } catch (error: unknown) {
    console.error("[Products API GET]", error);
    return errorResponse(getErrorMessage(error));
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await requireVendorContext("vendor:manage_products");
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return errorResponse("Invalid product payload", 400, "VALIDATION_ERROR");
    const input = body as Omit<CreateProductInput, "vendorId">;
    if (!input.name || !input.slug || input.basePrice === undefined) return errorResponse("Missing required fields: name, slug, basePrice", 400, "VALIDATION_ERROR");
    const product = await ProductService.createProduct({ ...input, vendorId: context.vendorId });
    return successResponse(product, 201);
  } catch (error: unknown) {
    console.error("[Products API POST]", error);
    return authorizationError(error);
  }
}
