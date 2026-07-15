import { NextRequest } from "next/server";
import { ProductService } from "@/services/product";
import {
  successResponse,
  errorResponse,
  getErrorMessage,
} from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const vendorId = searchParams.get("vendorId") || undefined;
    const categoryId = searchParams.get("categoryId") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : undefined;
    const offset = searchParams.get("offset")
      ? parseInt(searchParams.get("offset")!)
      : undefined;

    const products = await ProductService.getAllProducts({
      vendorId,
      categoryId,
      status,
      search,
      limit,
      offset,
    });

    return successResponse(products);
  } catch (error: unknown) {
    console.error("[Products API GET]", error);
    return errorResponse(getErrorMessage(error));
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.vendorId || !body.name || !body.slug || !body.basePrice) {
      return errorResponse(
        "Missing required fields: vendorId, name, slug, basePrice",
        400,
        "VALIDATION_ERROR"
      );
    }

    const product = await ProductService.createProduct(body);
    return successResponse(product, 201);
  } catch (error: unknown) {
    console.error("[Products API POST]", error);
    return errorResponse(getErrorMessage(error));
  }
}